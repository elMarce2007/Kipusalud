package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "movimientos_inventario",
        schema = "kipusalud_inventory",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_movimiento_farmacia_idempotencia",
                columnNames = {"farmacia_id", "clave_idempotencia"}
        )
)
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "producto_id", nullable = false)
    private Long productoId;

    @Column(name = "lote_id")
    private Long loteId;

    @Column(name = "ingreso_id")
    private Long ingresoId;

    @Column(name = "salida_id")
    private Long salidaId;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "clave_idempotencia", nullable = false, length = 100)
    private String claveIdempotencia;

    @Column(nullable = false, length = 150)
    private String actor;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    /** Solo en ajustes: MERMA, VENCIMIENTO, DANIO, CONTEO, DEVOLUCION_PROVEEDOR u OTRO. */
    @Column(length = 30)
    private String motivo;

    @Column(length = 255)
    private String observacion;

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public Long getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public Long getLoteId() { return loteId; }
    public void setLoteId(Long loteId) { this.loteId = loteId; }
    public Long getIngresoId() { return ingresoId; }
    public void setIngresoId(Long ingresoId) { this.ingresoId = ingresoId; }
    public Long getSalidaId() { return salidaId; }
    public void setSalidaId(Long salidaId) { this.salidaId = salidaId; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public void setClaveIdempotencia(String claveIdempotencia) { this.claveIdempotencia = claveIdempotencia; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
