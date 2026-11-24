package com.kipusalud.personalservice.service;

import com.kipusalud.personalservice.dto.PersonalDto;
import com.kipusalud.personalservice.entity.Personal;
import com.kipusalud.personalservice.repository.PersonalRepository;
import com.kipusalud.personalservice.socket.SocketNotificationServer;
import com.kipusalud.security.TenantContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PersonalServiceImpl implements PersonalService {

    private final PersonalRepository personalRepository;
    private final SocketNotificationServer socketNotificationServer;

    public PersonalServiceImpl(
            PersonalRepository personalRepository,
            SocketNotificationServer socketNotificationServer) {

        this.personalRepository = personalRepository;
        this.socketNotificationServer = socketNotificationServer;
    }

    @Override
    public List<PersonalDto> listar() {
        return personalRepository.findAllByFarmaciaIdOrderByApellidosAscNombresAsc(
                TenantContext.requireFarmaciaId()).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public PersonalDto obtener(Long id) {
        return toDto(personalRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Personal no encontrado: " + id)));
    }

    @Override
    public PersonalDto crear(PersonalDto dto) {
        Personal personal = toEntity(dto);
        personal.setFarmaciaId(TenantContext.requireFarmaciaId());
        Personal personalGuardado = personalRepository.save(personal);

        socketNotificationServer.notificar(
                "Nuevo personal registrado: "
                        + personalGuardado.getNombres()
        );

        return toDto(personalGuardado);
    }

    @Override
    public PersonalDto actualizar(Long id, PersonalDto dto) {
        Personal personal = personalRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Personal no encontrado: " + id));

        personal.setNombres(dto.nombres());
        personal.setApellidos(dto.apellidos());
        personal.setCargo(dto.cargo());
        personal.setEmail(dto.email());
        aplicarDatos(personal, dto);

        Personal personalActualizado = personalRepository.save(personal);

        socketNotificationServer.notificar(
                "Personal actualizado: "
                        + personalActualizado.getNombres()
        );

        return toDto(personalActualizado);
    }

    @Override
    public void eliminar(Long id) {
        socketNotificationServer.notificar(
                "Personal eliminado con ID: " + id
        );

        personalRepository.deleteByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId());
    }

    private PersonalDto toDto(Personal p) {
        return new PersonalDto(p.getId(), p.getNombres(), p.getApellidos(), p.getCargo(), p.getEmail(),
                p.getDni(), p.getColegiatura(), p.getTelefono(), p.getTurno(), p.isActivo());
    }

    static final java.util.Set<String> TURNOS = java.util.Set.of("MANANA", "TARDE", "NOCHE", "ROTATIVO");

    /** DNI de 8 dígitos (único en la farmacia), colegiatura, teléfono, turno y estado. */
    private void aplicarDatos(Personal p, PersonalDto dto) {
        String dni = limpio(dto.dni());
        if (dni != null && !dni.matches("\\d{8}")) {
            throw error(org.springframework.http.HttpStatus.BAD_REQUEST, "El DNI debe tener 8 dígitos");
        }
        if (dni != null && personalRepository.existsByFarmaciaIdAndDniAndIdNot(
                TenantContext.requireFarmaciaId(), dni, p.getId() == null ? -1L : p.getId())) {
            throw error(org.springframework.http.HttpStatus.CONFLICT, "Ya existe un colaborador con el DNI " + dni);
        }
        String colegiatura = limpio(dto.colegiatura());
        String telefono = limpio(dto.telefono());
        if ((colegiatura != null && colegiatura.length() > 20) || (telefono != null && telefono.length() > 20)) {
            throw error(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "La colegiatura y el teléfono admiten hasta 20 caracteres");
        }
        String turno = limpio(dto.turno());
        if (turno != null) turno = turno.toUpperCase(java.util.Locale.ROOT);
        if (turno != null && !TURNOS.contains(turno)) {
            throw error(org.springframework.http.HttpStatus.BAD_REQUEST, "El turno no es válido");
        }
        p.setDni(dni);
        p.setColegiatura(colegiatura);
        p.setTelefono(telefono);
        p.setTurno(turno);
        p.setActivo(dto.activo() == null || dto.activo());
    }

    private static String limpio(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private static org.springframework.web.server.ResponseStatusException error(
            org.springframework.http.HttpStatus status, String mensaje) {
        return new org.springframework.web.server.ResponseStatusException(status, mensaje);
    }

    private Personal toEntity(PersonalDto dto) {
        Personal p = new Personal();
        p.setNombres(dto.nombres());
        p.setApellidos(dto.apellidos());
        p.setCargo(dto.cargo());
        p.setEmail(dto.email());
        aplicarDatos(p, dto);
        return p;
    }
}