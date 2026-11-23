package com.kipusalud.ventasservice.repository;

import com.kipusalud.ventasservice.entity.CorrelativoComprobante;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CorrelativoComprobanteRepository
        extends JpaRepository<CorrelativoComprobante, CorrelativoComprobante.Id> {

    /** Crea la fila del correlativo si no existe; es seguro ante solicitudes concurrentes. */
    @Modifying
    @Query(value = """
            INSERT INTO correlativos_comprobante (farmacia_id, serie, siguiente_numero)
            VALUES (:farmaciaId, :serie, 1)
            ON CONFLICT (farmacia_id, serie) DO NOTHING
            """, nativeQuery = true)
    void crearSiNoExiste(@Param("farmaciaId") Long farmaciaId, @Param("serie") String serie);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CorrelativoComprobante c where c.id.farmaciaId = :farmaciaId and c.id.serie = :serie")
    Optional<CorrelativoComprobante> findForUpdate(@Param("farmaciaId") Long farmaciaId,
                                                   @Param("serie") String serie);
}
