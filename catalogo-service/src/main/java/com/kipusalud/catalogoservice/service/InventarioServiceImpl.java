package com.kipusalud.catalogoservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.catalogoservice.dto.*;
import com.kipusalud.catalogoservice.entity.*;
import com.kipusalud.catalogoservice.repository.*;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventarioServiceImpl implements InventarioService {

    private final ProductoRepository productoRepository;
    private final LoteInventarioRepository loteRepository;
    private final IngresoMercaderiaRepository ingresoRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final SalidaInventarioRepository salidaRepository;
    private final ObjectMapper objectMapper;
    private final DomainEventOutbox domainEventOutbox;

    public InventarioServiceImpl(
            ProductoRepository productoRepository,
            LoteInventarioRepository loteRepository,
            IngresoMercaderiaRepository ingresoRepository,
            MovimientoInventarioRepository movimientoRepository,
            SalidaInventarioRepository salidaRepository,
            ObjectMapper objectMapper,
            DomainEventOutbox domainEventOutbox
    ) {
        this.productoRepository = productoRepository;
        this.loteRepository = loteRepository;
        this.ingresoRepository = ingresoRepository;
        this.movimientoRepository = movimientoRepository;
        this.salidaRepository = salidaRepository;
        this.objectMapper = objectMapper;
        this.domainEventOutbox = domainEventOutbox;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LoteInventarioDto> listarLotes(Long productoId) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (productoId == null || !productoRepository.existsByIdAndFarmaciaId(productoId, farmaciaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        return loteRepository.findAllByFarmaciaIdAndProductoIdOrderByFechaVencimientoAscCreadoEnAsc(
                        farmaciaId, productoId)
                .stream().map(this::toLoteDto).toList();
    }

    @Override
    @Transactional
    public IngresoMercaderiaDto registrarIngreso(IngresoMercaderiaRequest request) {
        validarIngreso(request);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        String huella = huella(request);
        Optional<IngresoMercaderia> repetido =
                ingresoRepository.findByFarmaciaIdAndClaveIdempotencia(farmaciaId, request.claveIdempotencia());
        if (repetido.isPresent()) {
            IngresoMercaderia ingreso = repetido.get();
            if (!ingreso.getHuellaSolicitud().equals(huella)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "La clave de idempotencia ya se usó con otros datos");
            }
            return toIngresoDto(ingreso, true);
        }

        IngresoMercaderia ingreso = new IngresoMercaderia();
        ingreso.setFarmaciaId(farmaciaId);
        ingreso.setClaveIdempotencia(request.claveIdempotencia().trim());
        ingreso.setHuellaSolicitud(huella);
        ingreso.setReferenciaDocumento(limpiarReferencia(request.referenciaDocumento()));
        ingreso.setCreadoPor(TenantContext.requireUsername());
        ingreso.setCreadoEn(LocalDateTime.now());
        ingreso = ingresoRepository.saveAndFlush(ingreso);

        Set<String> lotesEnSolicitud = new HashSet<>();
        for (int index = 0; index < request.lineas().size(); index++) {
            IngresoMercaderiaRequest.LineaIngresoRequest linea = request.lineas().get(index);
            Producto producto = productoRepository.findByIdAndFarmaciaIdForUpdate(
                            linea.productoId(), farmaciaId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Producto no encontrado en la farmacia"));
            String codigoLote = linea.codigoLote().trim().toUpperCase(Locale.ROOT);
            String claveLote = producto.getId() + ":" + codigoLote.toLowerCase(Locale.ROOT);
            if (!lotesEnSolicitud.add(claveLote)
                    || loteRepository.existsByFarmaciaIdAndProductoIdAndCodigoLote(
                            farmaciaId, producto.getId(), codigoLote)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El lote " + codigoLote + " ya está registrado para este producto");
            }
            if (producto.getStock() > Integer.MAX_VALUE - linea.cantidad()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El stock excedería el límite permitido para " + producto.getNombre());
            }

            LoteInventario lote = new LoteInventario();
            lote.setFarmaciaId(farmaciaId);
            lote.setProductoId(producto.getId());
            lote.setCodigoLote(codigoLote);
            lote.setFechaVencimiento(linea.fechaVencimiento());
            lote.setCantidadInicial(linea.cantidad());
            lote.setCantidadDisponible(linea.cantidad());
            lote.setVerificado(true);
            lote.setCreadoEn(ingreso.getCreadoEn());
            lote = loteRepository.save(lote);

            int stockAnterior = producto.getStock();
            producto.setStock(stockAnterior + linea.cantidad());
            productoRepository.save(producto);

            MovimientoInventario movimiento = new MovimientoInventario();
            movimiento.setFarmaciaId(farmaciaId);
            movimiento.setProductoId(producto.getId());
            movimiento.setLoteId(lote.getId());
            movimiento.setIngresoId(ingreso.getId());
            movimiento.setTipo("INGRESO");
            movimiento.setCantidad(linea.cantidad());
            movimiento.setClaveIdempotencia(request.claveIdempotencia().trim() + ":" + index);
            movimiento.setActor(TenantContext.requireUsername());
            movimiento.setCreadoEn(ingreso.getCreadoEn());
            movimientoRepository.save(movimiento);
            String dedupeKey = request.claveIdempotencia().trim() + ":" + index;
            domainEventOutbox.record("inventario.movimiento", producto.getId(), "inventory-receipt:" + dedupeKey,
                    Map.of("producto", producto.getNombre(), "stock", producto.getStock(),
                            "cantidadCambio", linea.cantidad(), "tipo", "INGRESO",
                            "loteId", lote.getId(), "codigoLote", lote.getCodigoLote()));
            publicarCambioUmbral(producto, stockAnterior, producto.getStock(), dedupeKey);
        }
        return toIngresoDto(ingreso, false);
    }

    @Override
    @Transactional
    public SalidaVentaDto registrarSalidaVenta(SalidaVentaRequest request) {
        Map<Long, Integer> cantidades = validarSalidaVenta(request);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        String clave = request.claveIdempotencia().trim();
        String huella = huellaSalida(cantidades);

        Optional<SalidaInventario> existente = salidaRepository.findByFarmaciaIdAndClaveIdempotencia(
                farmaciaId, clave);
        if (existente.isPresent()) {
            return salidaRepetida(existente.get(), huella);
        }

        Map<Long, Producto> productosBloqueados = new TreeMap<>();
        for (Long productoId : cantidades.keySet()) {
            Producto producto = productoRepository.findByIdAndFarmaciaIdForUpdate(productoId, farmaciaId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Producto no encontrado en la farmacia"));
            productosBloqueados.put(productoId, producto);
        }

        existente = salidaRepository.findByFarmaciaIdAndClaveIdempotencia(farmaciaId, clave);
        if (existente.isPresent()) {
            return salidaRepetida(existente.get(), huella);
        }

        SalidaInventario salida = new SalidaInventario();
        salida.setFarmaciaId(farmaciaId);
        salida.setClaveIdempotencia(clave);
        salida.setHuellaSolicitud(huella);
        salida.setCreadoPor(TenantContext.requireUsername());
        salida.setCreadoEn(LocalDateTime.now());
        salida = salidaRepository.saveAndFlush(salida);

        String prefijoMovimiento = "venta-" + huella.substring(0, 32) + "-";
        for (Map.Entry<Long, Integer> linea : cantidades.entrySet()) {
            Producto producto = productosBloqueados.get(linea.getKey());
            int solicitado = linea.getValue();
            if (producto.getStock() == null || producto.getStock() < solicitado) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Stock insuficiente para el producto " + producto.getNombre());
            }

            List<LoteInventario> lotes = loteRepository.findSellableLotsForUpdate(
                    farmaciaId, producto.getId(), LocalDate.now());
            List<FefoAllocator.Allocation> asignaciones;
            try {
                asignaciones = FefoAllocator.allocate(lotes, solicitado, LocalDate.now());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "No hay suficientes unidades verificadas y vigentes para " + producto.getNombre());
            }

            int indiceMovimiento = 0;
            for (FefoAllocator.Allocation asignacion : asignaciones) {
                LoteInventario lote = asignacion.lot();
                int cantidad = asignacion.quantity();
                lote.setCantidadDisponible(lote.getCantidadDisponible() - cantidad);
                loteRepository.save(lote);

                MovimientoInventario movimiento = new MovimientoInventario();
                movimiento.setFarmaciaId(farmaciaId);
                movimiento.setProductoId(producto.getId());
                movimiento.setLoteId(lote.getId());
                movimiento.setSalidaId(salida.getId());
                movimiento.setTipo("VENTA");
                movimiento.setCantidad(-cantidad);
                movimiento.setClaveIdempotencia(prefijoMovimiento + indiceMovimiento++);
                movimiento.setActor(TenantContext.requireUsername());
                movimiento.setCreadoEn(salida.getCreadoEn());
                movimientoRepository.save(movimiento);
            }

            int stockAnterior = producto.getStock();
            producto.setStock(stockAnterior - solicitado);
            productoRepository.save(producto);
            domainEventOutbox.record("inventario.movimiento", producto.getId(),
                    "inventory-sale:" + clave + ":" + producto.getId(),
                    Map.of("producto", producto.getNombre(), "stock", producto.getStock(),
                            "cantidadCambio", -solicitado, "tipo", "VENTA"));
            publicarCambioUmbral(producto, stockAnterior, producto.getStock(), clave + ":" + producto.getId());
        }

        return toSalidaDto(salida, false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoInventarioDto> listarKardex(Long productoId) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (productoId == null || !productoRepository.existsByIdAndFarmaciaId(productoId, farmaciaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        Map<Long, LoteInventario> lotes = loteRepository
                .findAllByFarmaciaIdAndProductoIdOrderByFechaVencimientoAscCreadoEnAsc(farmaciaId, productoId)
                .stream().collect(Collectors.toMap(LoteInventario::getId, lote -> lote));
        return movimientoRepository.findAllByFarmaciaIdAndProductoIdOrderByCreadoEnDesc(farmaciaId, productoId)
                .stream().map(m -> {
                    LoteInventario lote = m.getLoteId() == null ? null : lotes.get(m.getLoteId());
                    return new MovimientoInventarioDto(
                            m.getId(), m.getProductoId(), m.getLoteId(), m.getTipo(), m.getCantidad(),
                            m.getClaveIdempotencia(), m.getActor(), m.getCreadoEn(),
                            lote == null ? null : lote.getCodigoLote(),
                            lote == null ? null : lote.getFechaVencimiento(),
                            m.getMotivo(), m.getObservacion());
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertaInventarioDto> listarAlertas(int diasVencimiento) {
        if (diasVencimiento < 1 || diasVencimiento > 365) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El rango de alertas debe ser de 1 a 365 días");
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(diasVencimiento);
        List<AlertaInventarioDto> alertas = loteRepository
                .findAllByFarmaciaIdAndVerificadoTrueAndCantidadDisponibleGreaterThanAndFechaVencimientoBetweenOrderByFechaVencimientoAsc(
                        farmaciaId, 0, hoy, limite)
                .stream()
                .map(lote -> {
                    Producto producto = productoRepository.findByIdAndFarmaciaId(
                                    lote.getProductoId(), farmaciaId)
                            .orElseThrow(() -> new IllegalStateException(
                                    "Lote vinculado a un producto inexistente en su farmacia"));
                    long dias = hoy.until(lote.getFechaVencimiento()).getDays();
                    return new AlertaInventarioDto("VENCIMIENTO", producto.getId(), producto.getNombre(),
                            lote.getId(), lote.getCodigoLote(), lote.getFechaVencimiento(),
                            lote.getCantidadDisponible(), dias <= 7 ? "ALTA" : "MEDIA");
                }).collect(Collectors.toCollection(ArrayList::new));
        return List.copyOf(alertas);
    }

    /** Motivos admitidos para dar de baja unidades de un lote. */
    static final Set<String> MOTIVOS_AJUSTE =
            Set.of("MERMA", "VENCIMIENTO", "DANIO", "CONTEO", "DEVOLUCION_PROVEEDOR", "OTRO");

    @Override
    @Transactional(readOnly = true)
    public List<ResumenInventarioDto> resumen(int diasPorVencer) {
        if (diasPorVencer < 1 || diasPorVencer > 365) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El rango de vencimiento debe ser de 1 a 365 días");
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(diasPorVencer);
        Map<Long, List<LoteInventario>> lotesPorProducto = loteRepository
                .findAllByFarmaciaIdAndCantidadDisponibleGreaterThan(farmaciaId, 0).stream()
                .collect(Collectors.groupingBy(LoteInventario::getProductoId));
        return productoRepository.findAllByFarmaciaIdOrderByNombreAsc(farmaciaId).stream()
                .map(producto -> resumirProducto(producto,
                        lotesPorProducto.getOrDefault(producto.getId(), List.of()), hoy, limite))
                .toList();
    }

    static ResumenInventarioDto resumirProducto(Producto producto, List<LoteInventario> lotes,
                                                LocalDate hoy, LocalDate limitePorVencer) {
        List<LoteInventario> vigentes = lotes.stream()
                .filter(LoteInventario::isVerificado)
                .filter(l -> l.getFechaVencimiento() != null && !l.getFechaVencimiento().isBefore(hoy))
                .sorted(Comparator.comparing(LoteInventario::getFechaVencimiento)
                        .thenComparing(LoteInventario::getCreadoEn))
                .toList();
        int vencidas = lotes.stream()
                .filter(l -> l.getFechaVencimiento() != null && l.getFechaVencimiento().isBefore(hoy))
                .mapToInt(LoteInventario::getCantidadDisponible).sum();
        int porVencer = (int) vigentes.stream()
                .filter(l -> !l.getFechaVencimiento().isAfter(limitePorVencer)).count();
        ResumenInventarioDto.LoteFefo fefo = vigentes.isEmpty() ? null : new ResumenInventarioDto.LoteFefo(
                vigentes.get(0).getId(), vigentes.get(0).getCodigoLote(),
                vigentes.get(0).getFechaVencimiento(), vigentes.get(0).getCantidadDisponible());
        return new ResumenInventarioDto(producto.getId(), producto.getStock(), producto.getStockMinimo(),
                vigentes.size(), vencidas, porVencer, fefo);
    }

    @Override
    @Transactional(readOnly = true)
    public AsignacionFefoDto simularFefo(Long productoId, int cantidad) {
        if (cantidad < 1 || cantidad > 100_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser positiva");
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (productoId == null || !productoRepository.existsByIdAndFarmaciaId(productoId, farmaciaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        LocalDate hoy = LocalDate.now();
        List<LoteInventario> lotes = loteRepository.findSellableLots(farmaciaId, productoId, hoy);
        int disponible = lotes.stream().mapToInt(LoteInventario::getCantidadDisponible).sum();
        int asignable = Math.min(cantidad, disponible);
        List<AsignacionFefoDto.LoteAsignado> asignados = asignable == 0 ? List.of()
                : FefoAllocator.allocate(lotes, asignable, hoy).stream()
                        .map(a -> new AsignacionFefoDto.LoteAsignado(a.lot().getId(), a.lot().getCodigoLote(),
                                a.lot().getFechaVencimiento(), a.quantity()))
                        .toList();
        return new AsignacionFefoDto(productoId, cantidad, asignable == cantidad, cantidad - asignable, asignados);
    }

    @Override
    @Transactional(readOnly = true)
    public SalidaVentaDto lotesDeVenta(String claveIdempotencia) {
        if (claveIdempotencia == null || claveIdempotencia.isBlank() || claveIdempotencia.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clave de venta no válida");
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        SalidaInventario salida = salidaRepository
                .findByFarmaciaIdAndClaveIdempotencia(farmaciaId, claveIdempotencia.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "La venta no tiene salida de inventario registrada"));
        return toSalidaDto(salida, true);
    }

    @Override
    @Transactional
    public AjusteInventarioDto registrarAjuste(AjusteInventarioRequest request) {
        String rol = TenantContext.requireRole();
        if (!"ADMINISTRADOR".equals(rol) && !"QF_REGENTE".equals(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo el administrador o el químico farmacéutico pueden ajustar el stock");
        }
        validarAjuste(request);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        String clave = "ajuste:" + request.claveIdempotencia().trim();
        String motivo = request.motivo().trim().toUpperCase(Locale.ROOT);
        String observacion = request.observacion() == null || request.observacion().isBlank()
                ? null : request.observacion().trim();

        Optional<MovimientoInventario> repetido = movimientoRepository.findByFarmaciaIdAndClaveIdempotencia(
                farmaciaId, clave);
        if (repetido.isPresent()) {
            return ajusteRepetido(repetido.get(), request, motivo);
        }

        LoteInventario loteActual = loteRepository.findById(request.loteId())
                .filter(l -> farmaciaId.equals(l.getFarmaciaId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lote no encontrado"));
        // Mismo orden de bloqueo que las ventas (producto y luego lote) para evitar interbloqueos.
        Producto producto = productoRepository.findByIdAndFarmaciaIdForUpdate(loteActual.getProductoId(), farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        LoteInventario lote = loteRepository.findByIdAndFarmaciaIdForUpdate(request.loteId(), farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lote no encontrado"));
        int cantidad = request.cantidad();
        if (lote.getCantidadDisponible() < cantidad || producto.getStock() == null || producto.getStock() < cantidad) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El ajuste dejaría stock negativo: el lote " + lote.getCodigoLote() + " tiene "
                            + lote.getCantidadDisponible() + " unidades");
        }

        lote.setCantidadDisponible(lote.getCantidadDisponible() - cantidad);
        loteRepository.save(lote);
        int stockAnterior = producto.getStock();
        producto.setStock(stockAnterior - cantidad);
        productoRepository.save(producto);

        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setFarmaciaId(farmaciaId);
        movimiento.setProductoId(producto.getId());
        movimiento.setLoteId(lote.getId());
        movimiento.setTipo("AJUSTE");
        movimiento.setCantidad(-cantidad);
        movimiento.setClaveIdempotencia(clave);
        movimiento.setMotivo(motivo);
        movimiento.setObservacion(observacion);
        movimiento.setActor(TenantContext.requireUsername());
        movimiento.setCreadoEn(LocalDateTime.now());
        movimiento = movimientoRepository.save(movimiento);

        domainEventOutbox.record("inventario.movimiento", producto.getId(), "inventory-adjustment:" + clave,
                Map.of("producto", producto.getNombre(), "stock", producto.getStock(),
                        "cantidadCambio", -cantidad, "tipo", "AJUSTE", "motivo", motivo,
                        "loteId", lote.getId(), "codigoLote", lote.getCodigoLote()));
        publicarCambioUmbral(producto, stockAnterior, producto.getStock(), clave);
        return toAjusteDto(movimiento, lote, producto.getStock(), false);
    }

    private void validarAjuste(AjusteInventarioRequest request) {
        if (request == null || request.claveIdempotencia() == null || request.claveIdempotencia().isBlank()
                || request.claveIdempotencia().trim().length() > 90) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Se requiere una clave de idempotencia válida");
        }
        if (request.loteId() == null || request.cantidad() == null
                || request.cantidad() < 1 || request.cantidad() > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Indica el lote y una cantidad positiva a retirar");
        }
        String motivo = request.motivo() == null ? "" : request.motivo().trim().toUpperCase(Locale.ROOT);
        if (!MOTIVOS_AJUSTE.contains(motivo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El motivo del ajuste no es válido");
        }
        boolean sinObservacion = request.observacion() == null || request.observacion().isBlank();
        if ("OTRO".equals(motivo) && sinObservacion) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Describe el motivo del ajuste");
        }
        if (!sinObservacion && request.observacion().trim().length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La observación es demasiado larga");
        }
    }

    private AjusteInventarioDto ajusteRepetido(MovimientoInventario movimiento, AjusteInventarioRequest request,
                                               String motivo) {
        if (!"AJUSTE".equals(movimiento.getTipo()) || !request.loteId().equals(movimiento.getLoteId())
                || movimiento.getCantidad() != -request.cantidad() || !motivo.equals(movimiento.getMotivo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La clave de idempotencia ya se usó con otros datos");
        }
        LoteInventario lote = loteRepository.findById(movimiento.getLoteId())
                .orElseThrow(() -> new IllegalStateException("Ajuste vinculado a un lote inexistente"));
        int stock = productoRepository.findByIdAndFarmaciaId(movimiento.getProductoId(), movimiento.getFarmaciaId())
                .map(Producto::getStock).orElse(0);
        return toAjusteDto(movimiento, lote, stock, true);
    }

    private AjusteInventarioDto toAjusteDto(MovimientoInventario m, LoteInventario lote, int stock, boolean repetido) {
        return new AjusteInventarioDto(m.getId(), m.getProductoId(), lote.getId(), lote.getCodigoLote(),
                -m.getCantidad(), m.getMotivo(), m.getObservacion(), stock, lote.getCantidadDisponible(),
                m.getActor(), m.getCreadoEn(), repetido);
    }

    private void validarIngreso(IngresoMercaderiaRequest request) {
        if (request == null || request.claveIdempotencia() == null
                || request.claveIdempotencia().isBlank() || request.claveIdempotencia().trim().length() > 90) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Se requiere una clave de idempotencia válida");
        }
        if (request.referenciaDocumento() != null && request.referenciaDocumento().trim().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La referencia documental es demasiado larga");
        }
        if (request.lineas() == null || request.lineas().isEmpty() || request.lineas().size() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El ingreso debe contener entre 1 y 500 líneas");
        }
        LocalDate hoy = LocalDate.now();
        for (IngresoMercaderiaRequest.LineaIngresoRequest linea : request.lineas()) {
            if (linea == null || linea.productoId() == null || linea.productoId() <= 0
                    || linea.codigoLote() == null || linea.codigoLote().isBlank()
                    || linea.codigoLote().trim().length() > 100
                    || linea.fechaVencimiento() == null || linea.fechaVencimiento().isBefore(hoy)
                    || linea.cantidad() == null || linea.cantidad() < 1 || linea.cantidad() > 1_000_000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cada línea requiere producto, lote, vencimiento futuro y cantidad positiva");
            }
        }
    }

    private Map<Long, Integer> validarSalidaVenta(SalidaVentaRequest request) {
        if (request == null || request.claveIdempotencia() == null
                || request.claveIdempotencia().isBlank()
                || request.claveIdempotencia().trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Se requiere una clave de idempotencia válida");
        }
        if (request.lineas() == null || request.lineas().isEmpty() || request.lineas().size() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La salida debe contener entre 1 y 500 líneas");
        }
        Map<Long, Integer> cantidades = new TreeMap<>();
        for (SalidaVentaRequest.LineaSalidaVentaRequest linea : request.lineas()) {
            if (linea == null || linea.productoId() == null || linea.productoId() <= 0
                    || linea.cantidad() == null || linea.cantidad() < 1 || linea.cantidad() > 100_000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cada línea requiere un producto y una cantidad positiva");
            }
            cantidades.merge(linea.productoId(), linea.cantidad(), (actual, adicional) -> {
                if (actual > 100_000 - adicional) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "La cantidad solicitada excede el límite permitido");
                }
                return actual + adicional;
            });
        }
        return cantidades;
    }

    private void publicarCambioUmbral(Producto producto, int anterior, int actual, String operacionId) {
        int minimo = producto.getStockMinimo() == null ? 0 : producto.getStockMinimo();
        if (minimo > 0 && anterior > minimo && actual <= minimo) {
            domainEventOutbox.record("inventario.stock_bajo", producto.getId(),
                    "low-stock:" + operacionId,
                    Map.of("producto", producto.getNombre(), "stock", actual, "stockMinimo", minimo,
                            "prioridad", actual == 0 ? "ALTA" : "MEDIA"));
        } else if (minimo > 0 && anterior <= minimo && actual > minimo) {
            domainEventOutbox.record("inventario.stock_recuperado", producto.getId(),
                    "stock-recovered:" + operacionId,
                    Map.of("producto", producto.getNombre(), "stock", actual, "stockMinimo", minimo));
        }
    }

    private String huellaSalida(Map<Long, Integer> cantidades) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(objectMapper.writeValueAsBytes(cantidades));
            return HexFormat.of().formatHex(digest);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo normalizar la salida para idempotencia", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no está disponible", e);
        }
    }

    private SalidaVentaDto salidaRepetida(SalidaInventario salida, String huella) {
        if (!salida.getHuellaSolicitud().equals(huella)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La clave de idempotencia ya se usó con otros productos o cantidades");
        }
        return toSalidaDto(salida, true);
    }

    private String huella(IngresoMercaderiaRequest request) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(objectMapper.writeValueAsBytes(new IngresoMercaderiaRequest(
                            request.claveIdempotencia().trim(),
                            limpiarReferencia(request.referenciaDocumento()),
                            request.lineas().stream()
                                    .map(linea -> new IngresoMercaderiaRequest.LineaIngresoRequest(
                                            linea.productoId(), linea.codigoLote().trim().toUpperCase(Locale.ROOT),
                                            linea.fechaVencimiento(), linea.cantidad()))
                                    .toList())));
            return HexFormat.of().formatHex(digest);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo normalizar el ingreso para idempotencia", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no está disponible", e);
        }
    }

    private String limpiarReferencia(String referencia) {
        if (referencia == null || referencia.isBlank()) {
            return null;
        }
        return referencia.trim();
    }

    private LoteInventarioDto toLoteDto(LoteInventario lote) {
        return new LoteInventarioDto(lote.getId(), lote.getProductoId(), lote.getCodigoLote(),
                lote.getFechaVencimiento(), lote.getCantidadInicial(), lote.getCantidadDisponible(),
                lote.isVerificado(), lote.getCreadoEn());
    }

    private IngresoMercaderiaDto toIngresoDto(IngresoMercaderia ingreso, boolean repetido) {
        return new IngresoMercaderiaDto(ingreso.getId(), ingreso.getClaveIdempotencia(),
                ingreso.getReferenciaDocumento(), ingreso.getCreadoPor(), ingreso.getCreadoEn(), repetido);
    }

    private SalidaVentaDto toSalidaDto(SalidaInventario salida, boolean repetida) {
        List<SalidaVentaDto.LineaSalidaDto> lineas = movimientoRepository
                .findAllByFarmaciaIdAndSalidaIdOrderByIdAsc(salida.getFarmaciaId(), salida.getId())
                .stream()
                .map(movimiento -> {
                    LoteInventario lote = loteRepository.findById(movimiento.getLoteId())
                            .orElseThrow(() -> new IllegalStateException(
                                    "Movimiento de venta vinculado a un lote inexistente"));
                    return new SalidaVentaDto.LineaSalidaDto(
                            movimiento.getProductoId(),
                            lote.getId(),
                            lote.getCodigoLote(),
                            Math.negateExact(movimiento.getCantidad()),
                            movimiento.getCreadoEn(),
                            lote.getFechaVencimiento());
                })
                .toList();
        return new SalidaVentaDto(salida.getClaveIdempotencia(), repetida, lineas);
    }
}
