package com.kipusalud.ventasservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "detalle_ventas")
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productoId;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(nullable = false)
    private BigDecimal precioUnitario;

    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(name = "nombre_producto", length = 150)
    private String nombreProducto;

    @Column(name = "afectacion_igv", length = 20)
    private String afectacionIgv;

    @Column(name = "precio_incluye_igv")
    private Boolean precioIncluyeIgv;

    public DetalleVenta() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }
    public String getAfectacionIgv() { return afectacionIgv; }
    public void setAfectacionIgv(String afectacionIgv) { this.afectacionIgv = afectacionIgv; }
    public Boolean getPrecioIncluyeIgv() { return precioIncluyeIgv; }
    public void setPrecioIncluyeIgv(Boolean precioIncluyeIgv) { this.precioIncluyeIgv = precioIncluyeIgv; }
}
