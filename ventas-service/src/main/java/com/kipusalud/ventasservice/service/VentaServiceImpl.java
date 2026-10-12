package com.kipusalud.ventasservice.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.ventasservice.socket.SocketNotificationServer;
import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.dto.DetalleVentaDto;
import com.kipusalud.ventasservice.dto.SalidaVentaRequest;
import com.kipusalud.ventasservice.dto.VentaDto;
import com.kipusalud.ventasservice.entity.DetalleVenta;
import com.kipusalud.ventasservice.entity.Venta;
import com.kipusalud.ventasservice.repository.VentaRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class VentaServiceImpl implements VentaService {

    private final VentaRepository ventaRepository;
    private final SocketNotificationServer socketNotificationServer;
    private final CatalogoClient catalogoClient;
    private final ClienteClient clienteClient;
    private final ObjectMapper objectMapper;
    private final DomainEventOutbox domainEventOutbox;

    public VentaServiceImpl(
            VentaRepository ventaRepository,
            SocketNotificationServer socketNotificationServer,
            CatalogoClient catalogoClient,
            ClienteClient clienteClient,
            ObjectMapper objectMapper,
            DomainEventOutbox domainEventOutbox
    ) {
        this.ventaRepository = ventaRepository;
        this.socketNotificationServer = socketNotificationServer;
        this.catalogoClient = catalogoClient;
        this.clienteClient = clienteClient;
        this.objectMapper = objectMapper;
        this.domainEventOutbox = domainEventOutbox;
    }

    @Override
    public List<VentaDto> listar() {
        return ventaRepository.findAllByFarmaciaIdOrderByFechaDesc(
                TenantContext.requireFarmaciaId()).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public VentaDto obtener(Long id) {
        return toDto(ventaRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + id)));
    }

    @Override
    @Transactional
    public VentaDto reintentar(Long id) {
        Venta venta = ventaRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada"));
        if (!"PENDIENTE_STOCK".equals(venta.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Solo se pueden reintentar ventas pendientes de confirmación de inventario");
        }
        Map<Long, Integer> cantidades = new TreeMap<>();
        venta.getDetalles().forEach(detalle -> cantidades.merge(
                detalle.getProductoId(), detalle.getCantidad(), Integer::sum));
        return confirmarSalidaYVenta(venta, cantidades);
    }

    @Override
    @Transactional
    public VentaDto crear(VentaDto dto) {
        String claveIdempotencia = validarClaveIdempotencia(dto == null ? null : dto.claveIdempotencia());
        if (dto.detalles() == null || dto.detalles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La venta debe incluir productos");
        }
        if (dto.clienteId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La venta requiere un cliente");
        }
        Map<Long, Integer> cantidadesPorProducto = new TreeMap<>();
        for (DetalleVentaDto detalle : dto.detalles()) {
            if (detalle == null || detalle.productoId() == null
                    || detalle.cantidad() == null || detalle.cantidad() < 1 || detalle.cantidad() > 100_000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Los productos y cantidades de la venta no son válidos");
            }
            cantidadesPorProducto.merge(detalle.productoId(), detalle.cantidad(), (previa, nueva) -> {
                if (previa > 100_000 - nueva) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "La cantidad solicitada excede el límite permitido");
                }
                return previa + nueva;
            });
        }

        String metodoPago = validarMetodoPago(dto.metodoPago());
        boolean confirmacionManualPago = Boolean.TRUE.equals(dto.confirmacionManualPago());
        if (!metodoPago.equals("EFECTIVO") && !confirmacionManualPago) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Confirma la verificación manual del pago externo");
        }
        if (metodoPago.equals("EFECTIVO") && confirmacionManualPago) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La confirmación manual solo aplica a pagos externos");
        }
        String huella = huellaSolicitud(dto, cantidadesPorProducto, metodoPago, confirmacionManualPago);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        var existente = ventaRepository.findByFarmaciaIdAndClaveIdempotencia(farmaciaId, claveIdempotencia);
        if (existente.isPresent()) {
            Venta ventaExistente = existente.get();
            if (!huella.equals(ventaExistente.getHuellaSolicitud())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "La clave de idempotencia ya se usó con otros datos de venta");
            }
            if ("CONFIRMADA".equals(ventaExistente.getEstado())) {
                return toDto(ventaExistente);
            }
            return confirmarSalidaYVenta(ventaExistente, cantidadesPorProducto);
        }

        clienteClient.validarCliente(dto.clienteId());
        Map<Long, CatalogoClient.ProductoCatalogo> productos = cantidadesPorProducto.keySet().stream()
                .map(catalogoClient::obtenerProducto)
                .collect(Collectors.toMap(CatalogoClient.ProductoCatalogo::id, producto -> producto));
        cantidadesPorProducto.forEach((id, cantidad) -> {
            CatalogoClient.ProductoCatalogo producto = productos.get(id);
            if (producto.precio() == null || producto.precio().signum() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "El catálogo devolvió un precio de producto no válido");
            }
            if (producto.stock() == null || producto.stock() < 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El catálogo devolvió un stock no válido para " + producto.nombre());
            }
        });

        Venta venta = new Venta();
        venta.setFecha(LocalDateTime.now());
        venta.setClienteId(dto.clienteId());
        venta.setFarmaciaId(farmaciaId);
        venta.setClaveIdempotencia(claveIdempotencia);
        venta.setHuellaSolicitud(huella);
        venta.setEstado("PENDIENTE_STOCK");

        List<DetalleVenta> detalles = dto.detalles().stream().map(d -> {
            BigDecimal precio = productos.get(d.productoId()).precio();
            DetalleVenta detalle = new DetalleVenta();
            detalle.setProductoId(d.productoId());
            detalle.setCantidad(d.cantidad());
            detalle.setPrecioUnitario(precio);
            BigDecimal subtotal = precio.multiply(BigDecimal.valueOf(d.cantidad()));
            if ("10".equals(productos.get(d.productoId()).afectacionIgv())
                    && Boolean.FALSE.equals(productos.get(d.productoId()).precioIncluyeIgv())) {
                subtotal = subtotal.multiply(new BigDecimal("1.18")).setScale(2, java.math.RoundingMode.HALF_UP);
            }
            detalle.setSubtotal(subtotal);
            detalle.setNombreProducto(productos.get(d.productoId()).nombre());
            detalle.setAfectacionIgv(productos.get(d.productoId()).afectacionIgv());
            detalle.setPrecioIncluyeIgv(productos.get(d.productoId()).precioIncluyeIgv());
            return detalle;
        }).collect(Collectors.toList());

        venta.setDetalles(detalles);
        BigDecimal total = detalles.stream()
                .map(DetalleVenta::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        venta.setTotal(total);

        BigDecimal montoRecibido = metodoPago.equals("EFECTIVO")
                ? validarPagoEfectivo(dto.montoRecibido(), total)
                : total;
        venta.setMetodoPago(metodoPago);
        venta.setMontoRecibido(montoRecibido);
        venta.setVuelto(metodoPago.equals("EFECTIVO")
                ? montoRecibido.subtract(total)
                : BigDecimal.ZERO);
        venta.setConfirmacionManualPago(confirmacionManualPago);
        if (confirmacionManualPago) {
            venta.setPagoConfirmadoPor(TenantContext.requireUsername());
            venta.setPagoConfirmadoEn(LocalDateTime.now());
        }

        Venta saved = ventaRepository.saveAndFlush(venta);
        return confirmarSalidaYVenta(saved, cantidadesPorProducto);
    }

    private VentaDto confirmarSalidaYVenta(Venta venta, Map<Long, Integer> cantidadesPorProducto) {
        List<SalidaVentaRequest.LineaSalidaVentaRequest> lineas = cantidadesPorProducto.entrySet().stream()
                .map(entry -> new SalidaVentaRequest.LineaSalidaVentaRequest(entry.getKey(), entry.getValue()))
                .toList();
        catalogoClient.descontarPorLotes(venta.getClaveIdempotencia(), lineas);
        venta.setEstado("CONFIRMADA");
        Venta confirmada = ventaRepository.saveAndFlush(venta);
        domainEventOutbox.record("venta.confirmada", confirmada.getId(),
                "sale:" + TenantContext.requireFarmaciaId() + ":" + confirmada.getId(),
                Map.of("total", confirmada.getTotal(), "metodoPago", confirmada.getMetodoPago(),
                        "cantidadLineas", confirmada.getDetalles().size(),
                        "productos", confirmada.getDetalles().stream().map(detail -> Map.of(
                                "productoId", detail.getProductoId(),
                                "nombre", detail.getNombreProducto(),
                                "cantidad", detail.getCantidad())).toList()));
        return toDto(confirmada);
    }

    private String validarClaveIdempotencia(String claveIdempotencia) {
        if (claveIdempotencia == null || claveIdempotencia.isBlank()
                || claveIdempotencia.trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Se requiere una clave de idempotencia válida para registrar la venta");
        }
        return claveIdempotencia.trim();
    }

    private String huellaSolicitud(
            VentaDto dto,
            Map<Long, Integer> cantidades,
            String metodoPago,
            boolean confirmacionManualPago
    ) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    objectMapper.writeValueAsBytes(new SolicitudVentaNormalizada(
                            dto.clienteId(), metodoPago, dto.montoRecibido(), confirmacionManualPago, cantidades)));
            return HexFormat.of().formatHex(digest);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo normalizar la solicitud de venta", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no está disponible", e);
        }
    }

    private record SolicitudVentaNormalizada(
            Long clienteId,
            String metodoPago,
            BigDecimal montoRecibido,
            boolean confirmacionManualPago,
            Map<Long, Integer> cantidades
    ) {}

    private String validarMetodoPago(String metodoPago) {
        if (metodoPago == null
                || !Set.of("EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA").contains(metodoPago)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El método de pago no es válido");
        }
        return metodoPago;
    }

    private BigDecimal validarPagoEfectivo(BigDecimal montoRecibido, BigDecimal total) {
        if (montoRecibido == null || montoRecibido.compareTo(total) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El monto recibido debe cubrir el total de la venta");
        }
        return montoRecibido;
    }

    private VentaDto toDto(Venta v) {
        List<DetalleVentaDto> detallesDto = v.getDetalles().stream()
                .map(d -> new DetalleVentaDto(d.getId(), d.getProductoId(), d.getCantidad(),
                        d.getPrecioUnitario(), d.getSubtotal()))
                .collect(Collectors.toList());
        return new VentaDto(v.getId(), v.getFecha(), v.getClienteId(), v.getTotal(), detallesDto,
                v.getMetodoPago(), v.getMontoRecibido(), v.getVuelto(),
                v.isConfirmacionManualPago(), v.getPagoConfirmadoPor(), v.getPagoConfirmadoEn(),
                v.getClaveIdempotencia(), v.getEstado());
    }
}
