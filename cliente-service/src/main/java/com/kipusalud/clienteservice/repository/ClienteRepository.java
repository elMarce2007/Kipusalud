package com.kipusalud.clienteservice.repository;

import com.kipusalud.clienteservice.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    List<Cliente> findAllByFarmaciaIdOrderByApellidosAscNombresAsc(Long farmaciaId);
    Optional<Cliente> findByIdAndFarmaciaId(Long id, Long farmaciaId);
    Optional<Cliente> findByDniAndFarmaciaId(String dni, Long farmaciaId);
    void deleteByIdAndFarmaciaId(Long id, Long farmaciaId);
}
