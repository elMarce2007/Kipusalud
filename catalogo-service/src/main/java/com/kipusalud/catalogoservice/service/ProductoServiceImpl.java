package com.kipusalud.catalogoservice.service;
import com.kipusalud.catalogoservice.socket.SocketNotificationServer;
import com.kipusalud.catalogoservice.dto.ProductoDto;
import com.kipusalud.catalogoservice.entity.Categoria;
import com.kipusalud.catalogoservice.entity.Producto;
import com.kipusalud.catalogoservice.repository.CategoriaRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final SocketNotificationServer socketNotificationServer;
    private final DomainEventOutbox domainEventOutbox;

    public ProductoServiceImpl(
            ProductoRepository productoRepository, CategoriaRepository categoriaRepository,
            SocketNotificationServer socketNotificationServer, DomainEventOutbox domainEventOutbox) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.socketNotificationServer = socketNotificationServer;
        this.domainEventOutbox = domainEventOutbox;
    }
    @Override
    public List<ProductoDto> listar() {
        return productoRepository.findAllByFarmaciaIdOrderByNombreAsc(
                TenantContext.requireFarmaciaId()).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public ProductoDto obtener(Long id) {
        return toDto(productoRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id)));
    }

    @Override
    @Transactional
    public ProductoDto crear(ProductoDto dto) {
        validarConfiguracionTributaria(dto.afectacionIgv(), dto.precioIncluyeIgv());
        if ((dto.afectacionIgv() != null || dto.precioIncluyeIgv() != null)
                && "EMPLEADO".equals(TenantContext.requireRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Solo el administrador o el químico farmacéutico puede configurar datos tributarios");
        }

        Producto producto = toEntity(dto);
        producto.setFarmaciaId(TenantContext.requireFarmaciaId());
        Producto productoGuardado = productoRepository.save(producto);
        domainEventOutbox.record("producto.creado", productoGuardado.getId(),
                "producto:creado:" + productoGuardado.getId(),
                java.util.Map.of("nombre", productoGuardado.getNombre(), "stock", productoGuardado.getStock(),
                        "stockMinimo", productoGuardado.getStockMinimo()));

        socketNotificationServer.notificar(
                "Nuevo producto registrado: "
                        + productoGuardado.getNombre()
        );

        return toDto(productoGuardado);
    }

    @Override
    @Transactional
    public ProductoDto actualizar(Long id, ProductoDto dto) {
        Producto producto = productoRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id));
        if ((dto.afectacionIgv() != null || dto.precioIncluyeIgv() != null)
                && "EMPLEADO".equals(TenantContext.requireRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Solo el administrador o el químico farmacéutico puede modificar la configuración tributaria");
        }
        producto.setNombre(dto.nombre());
        producto.setDescripcion(dto.descripcion());
        producto.setPrecio(dto.precio());
        int stockAnterior = producto.getStock();
        producto.setStock(dto.stock());
        if (dto.stockMinimo() != null) {
            validarStockMinimo(dto.stockMinimo());
            producto.setStockMinimo(dto.stockMinimo());
        }
        if (dto.afectacionIgv() != null) {
            producto.setAfectacionIgv(dto.afectacionIgv());
        }
        if (dto.precioIncluyeIgv() != null) {
            producto.setPrecioIncluyeIgv(dto.precioIncluyeIgv());
        }
        validarConfiguracionTributaria(producto.getAfectacionIgv(), producto.getPrecioIncluyeIgv());
        if (dto.categoriaId() != null) {
            Categoria categoria = categoriaRepository.findByIdAndFarmaciaId(
                            dto.categoriaId(), TenantContext.requireFarmaciaId())
                    .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + dto.categoriaId()));
            producto.setCategoria(categoria);
        }
        Producto productoActualizado =
                productoRepository.save(producto);
        domainEventOutbox.record("producto.actualizado", productoActualizado.getId(),
                "producto:actualizado:" + productoActualizado.getId() + ":" + java.util.UUID.randomUUID(),
                java.util.Map.of("nombre", productoActualizado.getNombre(), "stock", productoActualizado.getStock(),
                        "stockMinimo", productoActualizado.getStockMinimo()));
        publicarCambioUmbral(productoActualizado, stockAnterior, productoActualizado.getStock());

        socketNotificationServer.notificar(
                "Producto actualizado: "
                        + productoActualizado.getNombre()
        );

        return toDto(productoActualizado);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Producto producto = productoRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Producto no encontrado"));
        socketNotificationServer.notificar(
                "Producto eliminado con ID: " + id
        );

        productoRepository.deleteByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId());
        domainEventOutbox.record("producto.eliminado", id, "producto:eliminado:" + id,
                java.util.Map.of("nombre", producto.getNombre()));
    }

    private ProductoDto toDto(Producto p) {
        Long categoriaId = p.getCategoria() != null ? p.getCategoria().getId() : null;
        return new ProductoDto(p.getId(), p.getNombre(), p.getDescripcion(), p.getPrecio(), p.getStock(),
                categoriaId, p.getAfectacionIgv(), p.getPrecioIncluyeIgv(), p.getStockMinimo());
    }

    private Producto toEntity(ProductoDto dto) {
        validarConfiguracionTributaria(dto.afectacionIgv(), dto.precioIncluyeIgv());
        Producto p = new Producto();
        p.setNombre(dto.nombre());
        p.setDescripcion(dto.descripcion());
        p.setPrecio(dto.precio());
        p.setStock(dto.stock());
        int stockMinimo = dto.stockMinimo() == null ? 0 : dto.stockMinimo();
        validarStockMinimo(stockMinimo);
        p.setStockMinimo(stockMinimo);
        p.setAfectacionIgv(dto.afectacionIgv());
        p.setPrecioIncluyeIgv(dto.precioIncluyeIgv());
        p.setFarmaciaId(TenantContext.requireFarmaciaId());
        if (dto.categoriaId() != null) {
            Categoria categoria = categoriaRepository.findByIdAndFarmaciaId(
                            dto.categoriaId(), TenantContext.requireFarmaciaId())
                    .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + dto.categoriaId()));
            p.setCategoria(categoria);
        }
        return p;
    }

    private void validarConfiguracionTributaria(String afectacionIgv, Boolean precioIncluyeIgv) {
        if (afectacionIgv == null && precioIncluyeIgv == null) return;
        if (afectacionIgv == null || precioIncluyeIgv == null
                || !Set.of("10", "20", "30").contains(afectacionIgv)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Configure una afectación IGV válida de SUNAT (10, 20 o 30) y si el precio incluye IGV");
        }
    }

    private void validarStockMinimo(Integer stockMinimo) {
        if (stockMinimo < 0 || stockMinimo > 1_000_000) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "El stock mínimo debe estar entre 0 y 1,000,000");
        }
    }

    private void publicarCambioUmbral(Producto producto, int stockAnterior, int stockNuevo) {
        int minimo = producto.getStockMinimo();
        if (minimo > 0 && stockAnterior > minimo && stockNuevo <= minimo) {
            domainEventOutbox.record("inventario.stock_bajo", producto.getId(),
                    "stock-bajo:" + producto.getId() + ":" + java.util.UUID.randomUUID(),
                    java.util.Map.of("producto", producto.getNombre(), "stock", stockNuevo,
                            "stockMinimo", minimo, "prioridad", stockNuevo == 0 ? "ALTA" : "MEDIA"));
        } else if (minimo > 0 && stockAnterior <= minimo && stockNuevo > minimo) {
            domainEventOutbox.record("inventario.stock_recuperado", producto.getId(),
                    "stock-recuperado:" + producto.getId() + ":" + java.util.UUID.randomUUID(),
                    java.util.Map.of("producto", producto.getNombre(), "stock", stockNuevo, "stockMinimo", minimo));
        }
    }
}
