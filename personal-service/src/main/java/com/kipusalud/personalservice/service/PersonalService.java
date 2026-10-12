package com.kipusalud.personalservice.service;

import com.kipusalud.personalservice.dto.PersonalDto;

import java.util.List;

public interface PersonalService {
    List<PersonalDto> listar();
    PersonalDto obtener(Long id);
    PersonalDto crear(PersonalDto dto);
    PersonalDto actualizar(Long id, PersonalDto dto);
    void eliminar(Long id);
}
