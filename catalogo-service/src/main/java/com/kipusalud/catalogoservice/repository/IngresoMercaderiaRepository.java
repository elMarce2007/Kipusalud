package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.IngresoMercaderia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface IngresoMercaderiaRepository extends JpaRepository<IngresoMercaderia, Long> {
    java.util.List<IngresoMercaderia> findAllByFarmaciaIdAndIdIn(Long farmaciaId, java.util.Collection<Long> ids);

    Optional<IngresoMercaderia> findByFarmaciaIdAndClaveIdempotencia(Long farmaciaId, String claveIdempotencia);
}
