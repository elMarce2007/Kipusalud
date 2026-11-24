package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.dto.VentaDto;

import java.util.List;

public interface VentaService {
    List<VentaDto> listar();
    VentaDto obtener(Long id);
    VentaDto crear(VentaDto dto);
    VentaDto reintentar(Long id);
    java.util.List<com.kipusalud.ventasservice.dto.ResumenClienteDto> resumenPorCliente();
}
