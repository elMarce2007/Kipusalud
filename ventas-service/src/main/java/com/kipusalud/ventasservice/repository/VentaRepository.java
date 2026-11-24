package com.kipusalud.ventasservice.repository;

import com.kipusalud.ventasservice.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findAllByFarmaciaIdOrderByFechaDesc(Long farmaciaId);
    Optional<Venta> findByIdAndFarmaciaId(Long id, Long farmaciaId);
    List<Venta> findAllByFarmaciaIdAndFechaGreaterThanEqualAndFechaBeforeOrderByFechaAsc(
            Long farmaciaId, java.time.LocalDateTime desde, java.time.LocalDateTime hasta);
    Optional<Venta> findByFarmaciaIdAndClaveIdempotencia(Long farmaciaId, String claveIdempotencia);
    List<Venta> findByClienteIdAndFarmaciaId(Long clienteId, Long farmaciaId);

    @org.springframework.data.jpa.repository.Query("""
            select new com.kipusalud.ventasservice.dto.ResumenClienteDto(
                v.clienteId, count(v), sum(v.total), max(v.fecha))
            from Venta v
            where v.farmaciaId = :farmaciaId and v.estado = 'CONFIRMADA' and v.clienteId is not null
            group by v.clienteId
            """)
    List<com.kipusalud.ventasservice.dto.ResumenClienteDto> resumirPorCliente(
            @org.springframework.data.repository.query.Param("farmaciaId") Long farmaciaId);
}
