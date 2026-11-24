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

    List<MovimientoInventario> findAllByFarmaciaIdAndProductoIdAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
            Long farmaciaId, Long productoId, java.time.LocalDateTime hasta);

    List<MovimientoInventario> findAllByFarmaciaIdAndTipoAndCreadoEnGreaterThanEqualAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
            Long farmaciaId, String tipo, java.time.LocalDateTime desde, java.time.LocalDateTime hasta);

    Optional<MovimientoInventario> findByFarmaciaIdAndClaveIdempotencia(
            Long farmaciaId, String claveIdempotencia);
}
