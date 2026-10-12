package com.kipusalud.catalogoservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false)
    private BigDecimal precio;

    @Column(nullable = false)
    private Integer stock;

    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 0;

    @Column(name = "afectacion_igv", length = 20)
    private String afectacionIgv;

    @Column(name = "precio_incluye_igv")
    private Boolean precioIncluyeIgv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    public Producto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Integer getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(Integer stockMinimo) { this.stockMinimo = stockMinimo; }
    public String getAfectacionIgv() { return afectacionIgv; }
    public void setAfectacionIgv(String afectacionIgv) { this.afectacionIgv = afectacionIgv; }
    public Boolean getPrecioIncluyeIgv() { return precioIncluyeIgv; }
    public void setPrecioIncluyeIgv(Boolean precioIncluyeIgv) { this.precioIncluyeIgv = precioIncluyeIgv; }
    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
}
