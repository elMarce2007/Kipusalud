package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "catalogo_importaciones_iniciales")
public class CatalogoImportacionInicial {

    @Id
    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "importado_en", nullable = false)
    private LocalDateTime importadoEn;

    protected CatalogoImportacionInicial() {}

    public CatalogoImportacionInicial(Long farmaciaId, LocalDateTime importadoEn) {
        this.farmaciaId = farmaciaId;
        this.importadoEn = importadoEn;
    }

    public Long getFarmaciaId() { return farmaciaId; }
    public LocalDateTime getImportadoEn() { return importadoEn; }
}
