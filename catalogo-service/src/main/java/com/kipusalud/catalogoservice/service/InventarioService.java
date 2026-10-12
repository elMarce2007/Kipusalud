package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.*;
import java.util.List;

public interface InventarioService {
    List<LoteInventarioDto> listarLotes(Long productoId);
    IngresoMercaderiaDto registrarIngreso(IngresoMercaderiaRequest request);
    SalidaVentaDto registrarSalidaVenta(SalidaVentaRequest request);
    List<MovimientoInventarioDto> listarKardex(Long productoId);
    List<AlertaInventarioDto> listarAlertas(int diasVencimiento);
}
