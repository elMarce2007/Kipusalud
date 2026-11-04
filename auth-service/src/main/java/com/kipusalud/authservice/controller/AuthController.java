package com.kipusalud.authservice.controller;

import com.kipusalud.authservice.dto.LoginRequest;
import com.kipusalud.authservice.dto.LoginResponse;
import com.kipusalud.authservice.dto.RegistroRequest;
import com.kipusalud.authservice.dto.CrearUsuarioRequest;
import com.kipusalud.authservice.dto.UsuarioDto;
import com.kipusalud.authservice.dto.ActualizarUsuarioRequest;
import com.kipusalud.authservice.dto.ActualizarFarmaciaRequest;
import com.kipusalud.authservice.dto.FarmaciaDto;
import com.kipusalud.authservice.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/registro")
    public ResponseEntity<LoginResponse> registro(@RequestBody RegistroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registrar(request));
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioDto>> listarUsuarios() {
        return ResponseEntity.ok(authService.listarUsuarios());
    }

    @PostMapping("/usuarios")
    public ResponseEntity<UsuarioDto> crearEmpleado(@RequestBody CrearUsuarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.crearEmpleado(request));
    }

    @PutMapping("/usuarios/{id}")
    public ResponseEntity<UsuarioDto> actualizarUsuario(
            @PathVariable Long id, @RequestBody ActualizarUsuarioRequest request) {
        return ResponseEntity.ok(authService.actualizarUsuario(id, request));
    }

    @GetMapping("/farmacia")
    public ResponseEntity<FarmaciaDto> obtenerFarmacia() {
        return ResponseEntity.ok(authService.obtenerFarmacia());
    }

    @PutMapping("/farmacia")
    public ResponseEntity<FarmaciaDto> actualizarFarmacia(@RequestBody ActualizarFarmaciaRequest request) {
        return ResponseEntity.ok(authService.actualizarFarmacia(request));
    }
}
