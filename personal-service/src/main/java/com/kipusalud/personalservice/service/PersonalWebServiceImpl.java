package com.kipusalud.personalservice.service;

import com.kipusalud.personalservice.dto.PersonalDto;
import com.kipusalud.personalservice.entity.Personal;
import com.kipusalud.personalservice.repository.PersonalRepository;
import com.kipusalud.security.TenantContext;
import jakarta.jws.WebService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@WebService(endpointInterface = "com.kipusalud.personalservice.service.IPersonalWebService",
            serviceName        = "PersonalWebService",
            portName           = "PersonalPort",
            targetNamespace    = "http://service.personalservice.kipusalud.com")
public class PersonalWebServiceImpl implements IPersonalWebService {

    private final PersonalRepository personalRepository;

    public PersonalWebServiceImpl(PersonalRepository personalRepository) {
        this.personalRepository = personalRepository;
    }

    @Override
    public String registrarPersonal(String nombres, String apellidos, String cargo, String email) {
        Personal p = new Personal();
        p.setNombres(nombres);
        p.setApellidos(apellidos);
        p.setCargo(cargo);
        p.setEmail(email);
        p.setFarmaciaId(TenantContext.requireFarmaciaId());

        Personal guardado = personalRepository.save(p);
        return "Personal registrado con ID: " + guardado.getId();
    }

    @Override
    public String actualizarPersonal(Long id, String nombres, String apellidos, String cargo, String email) {
        Optional<Personal> opt = personalRepository.findByIdAndFarmaciaId(
                id, TenantContext.requireFarmaciaId());
        if (opt.isEmpty()) return "Personal con ID " + id + " no encontrado.";

        Personal p = opt.get();
        p.setNombres(nombres);
        p.setApellidos(apellidos);
        p.setCargo(cargo);
        p.setEmail(email);
        personalRepository.save(p);

        return "Personal actualizado correctamente.";
    }

    @Override
    public String eliminarPersonal(Long id) {
        if (personalRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId()).isEmpty())
            return "Personal con ID " + id + " no encontrado.";

        personalRepository.deleteByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId());
        return "Personal eliminado correctamente.";
    }

    @Override
    public List<PersonalDto> listarPersonal() {
        return personalRepository.findAllByFarmaciaIdOrderByApellidosAscNombresAsc(
                        TenantContext.requireFarmaciaId()).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public PersonalDto buscarPersonalPorId(Long id) {
        return personalRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .map(this::toDto)
                .orElse(null);
    }

    @Override
    public List<PersonalDto> buscarPersonalPorCargo(String cargo) {
        return personalRepository.findByCargoAndFarmaciaId(cargo, TenantContext.requireFarmaciaId()).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private PersonalDto toDto(Personal p) {
        return new PersonalDto(p.getId(), p.getNombres(), p.getApellidos(), p.getCargo(), p.getEmail(),
                p.getDni(), p.getColegiatura(), p.getTelefono(), p.getTurno(), p.isActivo());
    }
}