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

    /** Estado de cada producto con su lote FEFO activo y lotes por vencer. */
    @GetMapping("/resumen")
    public ResponseEntity<List<ResumenInventarioDto>> resumen(
            @RequestParam(defaultValue = "60") int diasPorVencer) {
        return ResponseEntity.ok(inventarioService.resumen(diasPorVencer));
    }

    /** Vista previa de los lotes que usaría una venta; no descuenta nada. */
    @GetMapping("/productos/{productoId}/fefo")
    public ResponseEntity<AsignacionFefoDto> simularFefo(
            @PathVariable Long productoId, @RequestParam int cantidad) {
        return ResponseEntity.ok(inventarioService.simularFefo(productoId, cantidad));
    }

    /** Lotes de los que salió cada producto de una venta (por su clave de idempotencia). */
    @GetMapping("/ventas/{claveIdempotencia}/lotes")
    public ResponseEntity<SalidaVentaDto> lotesDeVenta(@PathVariable String claveIdempotencia) {
        return ResponseEntity.ok(inventarioService.lotesDeVenta(claveIdempotencia));
    }

    /** Baja de unidades de un lote (merma, vencimiento, daño, conteo, devolución). */
    @PostMapping("/ajustes")
    public ResponseEntity<AjusteInventarioDto> registrarAjuste(@RequestBody AjusteInventarioRequest request) {
        AjusteInventarioDto ajuste = inventarioService.registrarAjuste(request);
        return ResponseEntity.status(ajuste.repetido() ? HttpStatus.OK : HttpStatus.CREATED).body(ajuste);
    }
}
