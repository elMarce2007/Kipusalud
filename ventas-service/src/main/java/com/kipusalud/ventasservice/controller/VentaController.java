package com.kipusalud.ventasservice.controller;

import com.kipusalud.ventasservice.dto.VentaDto;
import com.kipusalud.ventasservice.dto.ComprobanteElectronicoDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionRequest;
import com.kipusalud.ventasservice.service.FacturaSunatService;
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

    public VentaController(
            VentaService ventaService,
            FacturaSunatService facturaSunatService,
            SunatConfiguracionService sunatConfiguracionService
    ) {
        this.ventaService = ventaService;
        this.facturaSunatService = facturaSunatService;
        this.sunatConfiguracionService = sunatConfiguracionService;
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
        VentaDto venta = ventaService.crear(dto);
        return ResponseEntity.status("CONFIRMADA".equals(venta.estado())
                ? HttpStatus.CREATED : HttpStatus.ACCEPTED).body(venta);
    }

    @PostMapping("/{id}/reintentar")
    public ResponseEntity<VentaDto> reintentar(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.reintentar(id));
    }

    @GetMapping("/facturacion/configuracion")
    public ResponseEntity<SunatConfiguracionDto> obtenerConfiguracionSunat() {
        return ResponseEntity.ok(sunatConfiguracionService.obtener());
    }

    @PutMapping("/facturacion/configuracion")
    public ResponseEntity<SunatConfiguracionDto> guardarConfiguracionSunat(
            @RequestBody SunatConfiguracionRequest request
    ) {
        return ResponseEntity.ok(sunatConfiguracionService.guardar(request));
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
