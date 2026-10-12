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
        return new PersonalDto(p.getId(), p.getNombres(), p.getApellidos(), p.getCargo(), p.getEmail());
    }

    private Personal toEntity(PersonalDto dto) {
        Personal p = new Personal();
        p.setNombres(dto.nombres());
        p.setApellidos(dto.apellidos());
        p.setCargo(dto.cargo());
        p.setEmail(dto.email());
        return p;
    }
}