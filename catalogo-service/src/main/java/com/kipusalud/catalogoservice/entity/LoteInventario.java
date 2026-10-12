package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "lotes",
        schema = "kipusalud_inventory",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_lote_farmacia_producto_codigo",
                columnNames = {"farmacia_id", "producto_id", "codigo_lote"}
        )
)
public class LoteInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "producto_id", nullable = false)
    private Long productoId;

    @Column(name = "codigo_lote", nullable = false, length = 100)
    private String codigoLote;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "cantidad_inicial", nullable = false)
    private Integer cantidadInicial;

    @Column(name = "cantidad_disponible", nullable = false)
    private Integer cantidadDisponible;

    @Column(nullable = false)
    private boolean verificado;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    public Long getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public String getCodigoLote() { return codigoLote; }
    public void setCodigoLote(String codigoLote) { this.codigoLote = codigoLote; }
    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }
    public Integer getCantidadInicial() { return cantidadInicial; }
    public void setCantidadInicial(Integer cantidadInicial) { this.cantidadInicial = cantidadInicial; }
    public Integer getCantidadDisponible() { return cantidadDisponible; }
    public void setCantidadDisponible(Integer cantidadDisponible) { this.cantidadDisponible = cantidadDisponible; }
    public boolean isVerificado() { return verificado; }
    public void setVerificado(boolean verificado) { this.verificado = verificado; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
