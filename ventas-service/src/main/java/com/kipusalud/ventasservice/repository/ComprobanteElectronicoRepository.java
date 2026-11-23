package com.kipusalud.ventasservice.repository;

import com.kipusalud.ventasservice.entity.ComprobanteElectronico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ComprobanteElectronicoRepository extends JpaRepository<ComprobanteElectronico, Long> {
    Optional<ComprobanteElectronico> findByFarmaciaIdAndVentaId(Long farmaciaId, Long ventaId);

    @Modifying
    @Query("""
            update ComprobanteElectronico c
            set c.estado = 'ENVIANDO'
            where c.id = :id and c.farmaciaId = :farmaciaId and c.estado = 'PREPARADA'
            """)
    int marcarEnviandoSiPreparada(@Param("id") Long id, @Param("farmaciaId") Long farmaciaId);

    /** El número se guarda con 8 dígitos, así que el máximo textual es el máximo numérico. */
    @Query("""
            select max(c.numero) from ComprobanteElectronico c
            where c.farmaciaId = :farmaciaId and c.tipoComprobante = :tipo and c.serie = :serie
            """)
    Optional<String> ultimoNumero(@Param("farmaciaId") Long farmaciaId,
                                  @Param("tipo") String tipo,
                                  @Param("serie") String serie);
}
