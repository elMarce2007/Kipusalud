package com.kipusalud.clienteservice.repository;

import com.kipusalud.clienteservice.entity.InformacionClinicaCliente;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InformacionClinicaClienteRepository extends JpaRepository<InformacionClinicaCliente, Long> {
    Optional<InformacionClinicaCliente> findByFarmaciaIdAndClienteId(Long farmaciaId, Long clienteId);
}
