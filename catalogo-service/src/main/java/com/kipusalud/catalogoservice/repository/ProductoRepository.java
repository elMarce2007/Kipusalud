package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findAllByFarmaciaIdOrderByNombreAsc(Long farmaciaId);
    boolean existsByFarmaciaId(Long farmaciaId);
    long countByFarmaciaId(Long farmaciaId);
    List<Producto> findByCategoriaIdAndFarmaciaId(Long categoriaId, Long farmaciaId);
    Optional<Producto> findByIdAndFarmaciaId(Long id, Long farmaciaId);
    boolean existsByIdAndFarmaciaId(Long id, Long farmaciaId);
    void deleteByIdAndFarmaciaId(Long id, Long farmaciaId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id = :id and p.farmaciaId = :farmaciaId")
    Optional<Producto> findByIdAndFarmaciaIdForUpdate(
            @Param("id") Long id, @Param("farmaciaId") Long farmaciaId);
}
