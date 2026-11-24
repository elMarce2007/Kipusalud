package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.CambiarPasswordRequest;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Cambio de la propia contraseña de un usuario autenticado. */
@Service
public class CambioPasswordService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public CambioPasswordService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void cambiarPropia(CambiarPasswordRequest request) {
        Usuario usuario = usuarioRepository.findByUsername(TenantContext.requireUsername())
                .filter(u -> u.getFarmaciaId().equals(TenantContext.requireFarmaciaId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión no válida"));
        if (request == null || request.passwordActual() == null
                || !passwordEncoder.matches(request.passwordActual(), usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta");
        }
        String nueva = request.nuevaPassword();
        if (nueva == null || nueva.length() < 12 || nueva.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe tener entre 12 y 72 caracteres");
        }
        if (nueva.equals(request.passwordActual())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe ser distinta de la actual");
        }
        usuario.setPassword(passwordEncoder.encode(nueva));
        usuarioRepository.save(usuario);
    }
}
