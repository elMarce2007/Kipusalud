package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.LoteInventario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface LoteInventarioRepository extends JpaRepository<LoteInventario, Long> {
    List<LoteInventario> findAllByFarmaciaIdAndProductoIdOrderByFechaVencimientoAscCreadoEnAsc(
            Long farmaciaId, Long productoId);

    List<LoteInventario> findAllByFarmaciaIdAndVerificadoTrueAndCantidadDisponibleGreaterThanAndFechaVencimientoBetweenOrderByFechaVencimientoAsc(
            Long farmaciaId, int cantidadDisponible, LocalDate desde, LocalDate hasta);

    boolean existsByFarmaciaIdAndProductoIdAndCodigoLote(Long farmaciaId, Long productoId, String codigoLote);

    @Query("""
            select l from LoteInventario l
            where l.verificado = true and l.cantidadDisponible > 0
              and l.fechaVencimiento between :desde and :hasta
            order by l.fechaVencimiento asc
            """)
    List<LoteInventario> findAllWithAvailableStockAndExpiryBetween(
            @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select l from LoteInventario l
            where l.farmaciaId = :farmaciaId
              and l.productoId = :productoId
              and l.verificado = true
              and l.cantidadDisponible > 0
              and l.fechaVencimiento is not null
              and l.fechaVencimiento >= :hoy
            order by l.fechaVencimiento asc, l.creadoEn asc, l.id asc
            """)
    List<LoteInventario> findSellableLotsForUpdate(
            @Param("farmaciaId") Long farmaciaId,
            @Param("productoId") Long productoId,
            @Param("hoy") LocalDate hoy);

    /** Lotes vendibles en orden FEFO, sin bloqueo (para la vista previa del punto de venta). */
    @Query("""
            select l from LoteInventario l
            where l.farmaciaId = :farmaciaId
              and l.productoId = :productoId
              and l.verificado = true
              and l.cantidadDisponible > 0
              and l.fechaVencimiento is not null
              and l.fechaVencimiento >= :hoy
            order by l.fechaVencimiento asc, l.creadoEn asc, l.id asc
            """)
    List<LoteInventario> findSellableLots(
            @Param("farmaciaId") Long farmaciaId,
            @Param("productoId") Long productoId,
            @Param("hoy") LocalDate hoy);

    /** Lotes con existencias de la farmacia, para el resumen de inventario. */
    List<LoteInventario> findAllByFarmaciaIdAndCantidadDisponibleGreaterThan(Long farmaciaId, int cantidad);

    List<LoteInventario> findAllByFarmaciaIdAndIdIn(Long farmaciaId, java.util.Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LoteInventario l where l.id = :id and l.farmaciaId = :farmaciaId")
    java.util.Optional<LoteInventario> findByIdAndFarmaciaIdForUpdate(
            @Param("id") Long id, @Param("farmaciaId") Long farmaciaId);
}
