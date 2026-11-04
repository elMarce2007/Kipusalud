package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.ProductoDto;
import com.kipusalud.catalogoservice.dto.AltaProductoRequest;

import java.util.List;

public interface ProductoService {
    List<ProductoDto> listar();
    ProductoDto obtener(Long id);
    ProductoDto crear(ProductoDto dto);
    ProductoDto crearConIngreso(AltaProductoRequest request);
    ProductoDto actualizar(Long id, ProductoDto dto);
    void eliminar(Long id);
}
