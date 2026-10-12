package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ingresos_mercaderia",
        schema = "kipusalud_inventory",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_ingreso_farmacia_idempotencia",
                columnNames = {"farmacia_id", "clave_idempotencia"}
        )
)
public class IngresoMercaderia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "clave_idempotencia", nullable = false, length = 100)
    private String claveIdempotencia;

    @Column(name = "huella_solicitud", nullable = false, length = 64)
    private String huellaSolicitud;

    @Column(name = "referencia_documento", length = 120)
    private String referenciaDocumento;

    @Column(name = "creado_por", nullable = false, length = 150)
    private String creadoPor;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    public Long getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public void setClaveIdempotencia(String claveIdempotencia) { this.claveIdempotencia = claveIdempotencia; }
    public String getHuellaSolicitud() { return huellaSolicitud; }
    public void setHuellaSolicitud(String huellaSolicitud) { this.huellaSolicitud = huellaSolicitud; }
    public String getReferenciaDocumento() { return referenciaDocumento; }
    public void setReferenciaDocumento(String referenciaDocumento) { this.referenciaDocumento = referenciaDocumento; }
    public String getCreadoPor() { return creadoPor; }
    public void setCreadoPor(String creadoPor) { this.creadoPor = creadoPor; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
