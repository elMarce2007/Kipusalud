package com.kipusalud.clienteservice.controller;

import com.kipusalud.clienteservice.dto.ClienteDto;
import com.kipusalud.clienteservice.dto.InformacionClinicaDto;
import com.kipusalud.clienteservice.service.InformacionClinicaService;
import com.kipusalud.clienteservice.service.ClienteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;
    private final InformacionClinicaService informacionClinicaService;

    public ClienteController(ClienteService clienteService, InformacionClinicaService informacionClinicaService) {
        this.clienteService = clienteService;
        this.informacionClinicaService = informacionClinicaService;
    }

    @GetMapping
    public ResponseEntity<List<ClienteDto>> listar() {
        return ResponseEntity.ok(clienteService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteDto> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<ClienteDto> crear(@RequestBody ClienteDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.crear(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClienteDto> actualizar(@PathVariable Long id, @RequestBody ClienteDto dto) {
        return ResponseEntity.ok(clienteService.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        clienteService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/informacion-clinica")
    public ResponseEntity<InformacionClinicaDto> obtenerInformacionClinica(@PathVariable Long id) {
        return ResponseEntity.ok(informacionClinicaService.obtener(id));
    }

    @PutMapping("/{id}/informacion-clinica")
    public ResponseEntity<InformacionClinicaDto> guardarInformacionClinica(
            @PathVariable Long id,
            @RequestBody InformacionClinicaDto dto
    ) {
        return ResponseEntity.ok(informacionClinicaService.guardar(id, dto));
    }
}
