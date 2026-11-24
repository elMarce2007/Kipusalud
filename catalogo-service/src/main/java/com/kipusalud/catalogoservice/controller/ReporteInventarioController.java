package com.kipusalud.catalogoservice.controller;

import com.kipusalud.catalogoservice.dto.KardexValorizadoDto;
import com.kipusalud.catalogoservice.dto.ReporteMermasDto;
import com.kipusalud.catalogoservice.service.ReporteInventarioService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Reportes de inventario (permiso INVENTARIO:VER). Fechas en formato ISO (yyyy-MM-dd). */
@RestController
@RequestMapping("/api/inventario/reportes")
public class ReporteInventarioController {

    private final ReporteInventarioService reporteService;

    public ReporteInventarioController(ReporteInventarioService reporteService) {
        this.reporteService = reporteService;
    }

    @GetMapping("/kardex")
    public ResponseEntity<KardexValorizadoDto> kardex(
            @RequestParam Long productoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(reporteService.kardex(productoId, desde, hasta));
    }

    @GetMapping("/mermas")
    public ResponseEntity<ReporteMermasDto> mermas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(reporteService.mermas(desde, hasta));
    }
}
