package com.kipusalud.clienteservice.service;

import com.kipusalud.clienteservice.dto.InformacionClinicaDto;
import com.kipusalud.clienteservice.entity.AuditoriaAccesoClinico;
import com.kipusalud.clienteservice.entity.InformacionClinicaCliente;
import com.kipusalud.clienteservice.repository.AuditoriaAccesoClinicoRepository;
import com.kipusalud.clienteservice.repository.ClienteRepository;
import com.kipusalud.clienteservice.repository.InformacionClinicaClienteRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InformacionClinicaService {

    private final ClienteRepository clienteRepository;
    private final InformacionClinicaClienteRepository informacionRepository;
    private final AuditoriaAccesoClinicoRepository auditoriaRepository;

    public InformacionClinicaService(
            ClienteRepository clienteRepository,
            InformacionClinicaClienteRepository informacionRepository,
            AuditoriaAccesoClinicoRepository auditoriaRepository
    ) {
        this.clienteRepository = clienteRepository;
        this.informacionRepository = informacionRepository;
        this.auditoriaRepository = auditoriaRepository;
    }

    @Transactional
    public InformacionClinicaDto obtener(Long clienteId) {
        Long farmaciaId = validarCliente(clienteId);
        InformacionClinicaDto dto = informacionRepository.findByFarmaciaIdAndClienteId(farmaciaId, clienteId)
                .map(this::toDto)
                .orElseGet(() -> new InformacionClinicaDto("", "", "", ""));
        auditoriaRepository.save(new AuditoriaAccesoClinico(
                farmaciaId, clienteId, TenantContext.requireUsername(), "LECTURA"));
        return dto;
    }

    @Transactional
    public InformacionClinicaDto guardar(Long clienteId, InformacionClinicaDto dto) {
        Long farmaciaId = validarCliente(clienteId);
        InformacionClinicaCliente informacion = informacionRepository
                .findByFarmaciaIdAndClienteId(farmaciaId, clienteId)
                .orElseGet(InformacionClinicaCliente::new);
        informacion.setFarmaciaId(farmaciaId);
        informacion.setClienteId(clienteId);
        informacion.setDiagnosticos(dto.diagnosticos());
        informacion.setTratamientos(dto.tratamientos());
        informacion.setAlergias(dto.alergias());
        informacion.setMedicamentos(dto.medicamentos());
        InformacionClinicaCliente saved = informacionRepository.save(informacion);
        auditoriaRepository.save(new AuditoriaAccesoClinico(
                farmaciaId, clienteId, TenantContext.requireUsername(), "EDICION"));
        return toDto(saved);
    }

    private Long validarCliente(Long clienteId) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (clienteRepository.findByIdAndFarmaciaId(clienteId, farmaciaId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado");
        }
        return farmaciaId;
    }

    private InformacionClinicaDto toDto(InformacionClinicaCliente informacion) {
        return new InformacionClinicaDto(informacion.getDiagnosticos(), informacion.getTratamientos(),
                informacion.getAlergias(), informacion.getMedicamentos());
    }
}
