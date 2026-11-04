package com.kipusalud.catalogoservice.controller;

import com.kipusalud.catalogoservice.dto.CatalogoInicialEstadoDto;
import com.kipusalud.catalogoservice.dto.CatalogoInicialResultadoDto;
import com.kipusalud.catalogoservice.service.ImportacionCatalogoInicialService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/administracion/catalogo-inicial")
public class ImportacionCatalogoInicialController {

    private final ImportacionCatalogoInicialService importacionService;

    public ImportacionCatalogoInicialController(ImportacionCatalogoInicialService importacionService) {
        this.importacionService = importacionService;
    }

    @GetMapping("/estado")
    public ResponseEntity<CatalogoInicialEstadoDto> estado() {
        return ResponseEntity.ok(importacionService.estado());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CatalogoInicialResultadoDto> importar(
            @RequestPart("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(importacionService.importar(archivo));
    }
}
