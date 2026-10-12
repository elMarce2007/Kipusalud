package com.kipusalud.catalogoservice.controller;

import com.kipusalud.catalogoservice.dto.*;
import com.kipusalud.catalogoservice.service.InventarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventario")
public class InventarioController {

    private final InventarioService inventarioService;

    public InventarioController(InventarioService inventarioService) {
        this.inventarioService = inventarioService;
    }

    @GetMapping("/productos/{productoId}/lotes")
    public ResponseEntity<List<LoteInventarioDto>> listarLotes(@PathVariable Long productoId) {
        return ResponseEntity.ok(inventarioService.listarLotes(productoId));
    }

    @PostMapping("/ingresos")
    public ResponseEntity<IngresoMercaderiaDto> registrarIngreso(
            @RequestBody IngresoMercaderiaRequest request) {
        IngresoMercaderiaDto ingreso = inventarioService.registrarIngreso(request);
        return ResponseEntity.status(ingreso.repetido() ? HttpStatus.OK : HttpStatus.CREATED).body(ingreso);
    }

    @PostMapping("/ventas/salida")
    public ResponseEntity<SalidaVentaDto> registrarSalidaVenta(@RequestBody SalidaVentaRequest request) {
        SalidaVentaDto salida = inventarioService.registrarSalidaVenta(request);
        return ResponseEntity.status(salida.repetida() ? HttpStatus.OK : HttpStatus.CREATED).body(salida);
    }

    @GetMapping("/productos/{productoId}/kardex")
    public ResponseEntity<List<MovimientoInventarioDto>> listarKardex(@PathVariable Long productoId) {
        return ResponseEntity.ok(inventarioService.listarKardex(productoId));
    }

    @GetMapping("/alertas")
    public ResponseEntity<List<AlertaInventarioDto>> listarAlertas(
            @RequestParam(defaultValue = "30") int diasVencimiento) {
        return ResponseEntity.ok(inventarioService.listarAlertas(diasVencimiento));
    }
}
