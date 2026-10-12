package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.CategoriaDto;

import java.util.List;

public interface CategoriaService {
    List<CategoriaDto> listar();
    CategoriaDto obtener(Long id);
    CategoriaDto crear(CategoriaDto dto);
    CategoriaDto actualizar(Long id, CategoriaDto dto);
    void eliminar(Long id);
}
