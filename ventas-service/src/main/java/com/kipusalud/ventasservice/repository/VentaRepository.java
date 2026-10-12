package com.kipusalud.ventasservice.repository;

import com.kipusalud.ventasservice.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findAllByFarmaciaIdOrderByFechaDesc(Long farmaciaId);
    Optional<Venta> findByIdAndFarmaciaId(Long id, Long farmaciaId);
    Optional<Venta> findByFarmaciaIdAndClaveIdempotencia(Long farmaciaId, String claveIdempotencia);
    List<Venta> findByClienteIdAndFarmaciaId(Long clienteId, Long farmaciaId);
}
