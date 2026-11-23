package com.kipusalud.ventasservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;

/** Correlativo por farmacia y serie de los comprobantes que no van a SUNAT. */
@Entity
@Table(name = "correlativos_comprobante")
public class CorrelativoComprobante {

    @EmbeddedId
    private Id id;

    @Column(name = "siguiente_numero", nullable = false)
    private Long siguienteNumero = 1L;

    public CorrelativoComprobante() {}

    public CorrelativoComprobante(Long farmaciaId, String serie) {
        this.id = new Id(farmaciaId, serie);
    }

    public Id getId() { return id; }
    public Long getSiguienteNumero() { return siguienteNumero; }
    public void setSiguienteNumero(Long siguienteNumero) { this.siguienteNumero = siguienteNumero; }

    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "farmacia_id", nullable = false)
        private Long farmaciaId;

        @Column(nullable = false, length = 4)
        private String serie;

        public Id() {}

        public Id(Long farmaciaId, String serie) {
            this.farmaciaId = farmaciaId;
            this.serie = serie;
        }

        public Long getFarmaciaId() { return farmaciaId; }
        public String getSerie() { return serie; }

        @Override
        public boolean equals(Object o) {
            return o instanceof Id other
                    && Objects.equals(farmaciaId, other.farmaciaId)
                    && Objects.equals(serie, other.serie);
        }

        @Override
        public int hashCode() {
            return Objects.hash(farmaciaId, serie);
        }
    }
}
