package com.kipusalud.personalservice.repository;

import com.kipusalud.personalservice.entity.Personal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PersonalRepository extends JpaRepository<Personal, Long> {
    List<Personal> findAllByFarmaciaIdOrderByApellidosAscNombresAsc(Long farmaciaId);
    Optional<Personal> findByIdAndFarmaciaId(Long id, Long farmaciaId);

    boolean existsByFarmaciaIdAndDniAndIdNot(Long farmaciaId, String dni, Long id);
    List<Personal> findByCargoAndFarmaciaId(String cargo, Long farmaciaId);
    void deleteByIdAndFarmaciaId(Long id, Long farmaciaId);
}
