package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "categorias")
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(name = "codigo_atc", length = 10)
    private String codigoAtc;

    @Column(name = "condicion_venta", nullable = false, length = 20)
    private String condicionVenta = "VENTA_LIBRE";

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    public Categoria() {}

    public String getCodigoAtc() { return codigoAtc; }
    public void setCodigoAtc(String codigoAtc) { this.codigoAtc = codigoAtc; }
    public String getCondicionVenta() { return condicionVenta; }
    public void setCondicionVenta(String condicionVenta) { this.condicionVenta = condicionVenta; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
}
