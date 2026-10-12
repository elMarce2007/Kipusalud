package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.SalidaInventario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SalidaInventarioRepository extends JpaRepository<SalidaInventario, Long> {
    Optional<SalidaInventario> findByFarmaciaIdAndClaveIdempotencia(Long farmaciaId, String claveIdempotencia);
}
