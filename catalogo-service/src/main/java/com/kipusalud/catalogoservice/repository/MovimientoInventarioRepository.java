package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {
    List<MovimientoInventario> findAllByFarmaciaIdAndProductoIdOrderByCreadoEnDesc(
            Long farmaciaId, Long productoId);

    List<MovimientoInventario> findAllByFarmaciaIdAndIngresoIdOrderByIdAsc(
            Long farmaciaId, Long ingresoId);

    List<MovimientoInventario> findAllByFarmaciaIdAndSalidaIdOrderByIdAsc(
            Long farmaciaId, Long salidaId);

    Optional<MovimientoInventario> findByFarmaciaIdAndClaveIdempotencia(
            Long farmaciaId, String claveIdempotencia);
}
