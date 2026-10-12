package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.CategoriaDto;
import com.kipusalud.catalogoservice.entity.Categoria;
import com.kipusalud.catalogoservice.repository.CategoriaRepository;
import org.springframework.stereotype.Service;
import com.kipusalud.catalogoservice.socket.SocketNotificationServer;
import com.kipusalud.security.TenantContext;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoriaServiceImpl implements CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final SocketNotificationServer socketNotificationServer;

    public CategoriaServiceImpl(
            CategoriaRepository categoriaRepository,
            SocketNotificationServer socketNotificationServer) {

        this.categoriaRepository = categoriaRepository;
        this.socketNotificationServer = socketNotificationServer;
    }

    @Override
    public List<CategoriaDto> listar() {
        return categoriaRepository.findAllByFarmaciaIdOrderByNombreAsc(
                TenantContext.requireFarmaciaId()).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public CategoriaDto obtener(Long id) {
        return toDto(categoriaRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + id)));
    }

    @Override
    public CategoriaDto crear(CategoriaDto dto) {

        Categoria categoria = toEntity(dto);
        categoria.setFarmaciaId(TenantContext.requireFarmaciaId());
        Categoria categoriaGuardada = categoriaRepository.save(categoria);

        socketNotificationServer.notificar(
                "Nueva categoria registrada: "
                        + categoriaGuardada.getNombre()
        );

        return toDto(categoriaGuardada);
    }

    @Override
    public CategoriaDto actualizar(Long id, CategoriaDto dto) {
        Categoria categoria = categoriaRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + id));
        categoria.setNombre(dto.nombre());
        categoria.setDescripcion(dto.descripcion());

        Categoria categoriaActualizada =
                categoriaRepository.save(categoria);

        socketNotificationServer.notificar(
                "Categoria actualizada: "
                        + categoriaActualizada.getNombre()
        );

        return toDto(categoriaActualizada);
    }

    @Override
    public void eliminar(Long id) {

        categoriaRepository.deleteByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId());

        socketNotificationServer.notificar(
                "Categoria eliminada con ID: " + id
        );
    }

    private CategoriaDto toDto(Categoria c) {
        return new CategoriaDto(c.getId(), c.getNombre(), c.getDescripcion());
    }

    private Categoria toEntity(CategoriaDto dto) {
        Categoria c = new Categoria();
        c.setNombre(dto.nombre());
        c.setDescripcion(dto.descripcion());
        return c;
    }
}
