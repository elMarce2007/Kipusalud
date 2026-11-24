package com.kipusalud.ventasservice.controller;

import com.kipusalud.ventasservice.dto.VentaDto;
import com.kipusalud.ventasservice.dto.ComprobanteElectronicoDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionRequest;
import com.kipusalud.ventasservice.dto.CredencialesSunatRequest;
import com.kipusalud.ventasservice.dto.OpcionesComprobanteDto;
import com.kipusalud.ventasservice.service.FacturaSunatService;
import com.kipusalud.ventasservice.service.RegistroVentaService;
import com.kipusalud.ventasservice.service.SunatConfiguracionService;
import com.kipusalud.ventasservice.service.VentaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService ventaService;
    private final FacturaSunatService facturaSunatService;
    private final SunatConfiguracionService sunatConfiguracionService;
    private final RegistroVentaService registroVentaService;
    private final com.kipusalud.ventasservice.service.ReporteVentasService reporteVentasService;

    public VentaController(
            VentaService ventaService,
            FacturaSunatService facturaSunatService,
            SunatConfiguracionService sunatConfiguracionService,
            RegistroVentaService registroVentaService,
            com.kipusalud.ventasservice.service.ReporteVentasService reporteVentasService
    ) {
        this.ventaService = ventaService;
        this.facturaSunatService = facturaSunatService;
        this.sunatConfiguracionService = sunatConfiguracionService;
        this.registroVentaService = registroVentaService;
        this.reporteVentasService = reporteVentasService;
    }

    @GetMapping
    public ResponseEntity<List<VentaDto>> listar() {
        return ResponseEntity.ok(ventaService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VentaDto> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<VentaDto> crear(@RequestBody VentaDto dto) {
        VentaDto venta = registroVentaService.registrar(dto);
        return ResponseEntity.status("CONFIRMADA".equals(venta.estado())
                ? HttpStatus.CREATED : HttpStatus.ACCEPTED).body(venta);
    }

    @PostMapping("/{id}/reintentar")
    public ResponseEntity<VentaDto> reintentar(@PathVariable Long id) {
        return ResponseEntity.ok(registroVentaService.reintentar(id));
    }

    @GetMapping("/facturacion/configuracion")
    public ResponseEntity<SunatConfiguracionDto> obtenerConfiguracionSunat() {
        return ResponseEntity.ok(sunatConfiguracionService.obtener());
    }

    /** Perfil fiscal de la farmacia (emisor y series). No recibe secretos. */
    @PutMapping("/facturacion/configuracion")
    public ResponseEntity<SunatConfiguracionDto> guardarConfiguracionSunat(
            @RequestBody SunatConfiguracionRequest request
    ) {
        return ResponseEntity.ok(sunatConfiguracionService.guardarPerfil(request));
    }

    @PutMapping("/facturacion/configuracion/credenciales")
    public ResponseEntity<SunatConfiguracionDto> guardarCredencialesSunat(
            @RequestBody CredencialesSunatRequest request
    ) {
        return ResponseEntity.ok(sunatConfiguracionService.guardarCredenciales(request));
    }

    /** Compras confirmadas por cliente (número, total y última compra). */
    /** Ventas por turno, vendedor, método de pago y día (fechas ISO; por defecto el mes en curso). */
    @GetMapping("/reportes/turnos")
    public ResponseEntity<com.kipusalud.ventasservice.dto.ReporteVentasTurnoDto> reportePorTurno(
            @RequestParam(required = false)
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            java.time.LocalDate desde,
            @RequestParam(required = false)
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            java.time.LocalDate hasta) {
        return ResponseEntity.ok(reporteVentasService.porTurno(desde, hasta));
    }

    @GetMapping("/clientes/resumen")
    public ResponseEntity<List<com.kipusalud.ventasservice.dto.ResumenClienteDto>> resumenPorCliente() {
        return ResponseEntity.ok(ventaService.resumenPorCliente());
    }

    /** Comprobantes disponibles para el punto de venta; sin datos secretos. */
    @GetMapping("/facturacion/opciones")
    public ResponseEntity<OpcionesComprobanteDto> opcionesComprobante() {
        return ResponseEntity.ok(sunatConfiguracionService.opciones());
    }

    @PostMapping("/{id}/factura-electronica")
    public ResponseEntity<ComprobanteElectronicoDto> emitirFactura(@PathVariable Long id) {
        ComprobanteElectronicoDto comprobante = facturaSunatService.emitir(id);
        HttpStatus status = "ACEPTADA".equals(comprobante.estado()) || "RECHAZADA".equals(comprobante.estado())
                ? HttpStatus.OK : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(comprobante);
    }

    @GetMapping("/{id}/factura-electronica")
    public ResponseEntity<ComprobanteElectronicoDto> obtenerFactura(@PathVariable Long id) {
        return ResponseEntity.ok(facturaSunatService.obtener(id));
    }

    @GetMapping(value = "/{id}/factura-electronica/cdr", produces = "application/zip")
    public ResponseEntity<byte[]> descargarCdr(@PathVariable Long id) {
        byte[] cdr = facturaSunatService.obtenerCdr(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CDR-" + id + ".zip\"")
                .body(cdr);
    }

    @PostMapping("/{id}/factura-electronica/consultar-sunat")
    public ResponseEntity<ComprobanteElectronicoDto> consultarFacturaEnSunat(@PathVariable Long id) {
        return ResponseEntity.ok(facturaSunatService.consultarEnSunat(id));
    }
}
