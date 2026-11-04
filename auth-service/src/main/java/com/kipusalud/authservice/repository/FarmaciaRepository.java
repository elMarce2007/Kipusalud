package com.kipusalud.authservice.repository;

import com.kipusalud.authservice.entity.Farmacia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FarmaciaRepository extends JpaRepository<Farmacia, Long> {
    Optional<Farmacia> findByCodigoIgnoreCase(String codigo);
}
