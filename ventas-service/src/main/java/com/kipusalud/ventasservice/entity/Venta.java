package com.kipusalud.ventasservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ventas")
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha;

    /** Opcional en boletas ("Público general"); obligatorio en facturas. */
    @Column(name = "cliente_id")
    private Long clienteId;

    @Column(nullable = false)
    private BigDecimal total;

    @Column(name = "metodo_pago", nullable = false, length = 20)
    private String metodoPago;

    @Column(name = "monto_recibido", nullable = false, precision = 12, scale = 2)
    private BigDecimal montoRecibido;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal vuelto;

    @Column(name = "confirmacion_manual_pago", nullable = false)
    private boolean confirmacionManualPago;

    @Column(name = "pago_confirmado_por", length = 150)
    private String pagoConfirmadoPor;

    @Column(name = "pago_confirmado_en")
    private LocalDateTime pagoConfirmadoEn;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "clave_idempotencia", length = 100)
    private String claveIdempotencia;

    @Column(name = "huella_solicitud", length = 64)
    private String huellaSolicitud;

    @Column(nullable = false, length = 30)
    private String estado;

    @Column(name = "tipo_comprobante", nullable = false, length = 20)
    private String tipoComprobante = "BOLETA_INTERNA";

    @Column(name = "serie_comprobante", length = 4)
    private String serieComprobante;

    @Column(name = "numero_comprobante", length = 8)
    private String numeroComprobante;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinTable(
            name = "ventas_detalles",
            joinColumns = @JoinColumn(name = "venta_id"),
            inverseJoinColumns = @JoinColumn(name = "detalles_id")
    )
    private List<DetalleVenta> detalles = new ArrayList<>();

    public Venta() {}

    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }
    public String getSerieComprobante() { return serieComprobante; }
    public void setSerieComprobante(String serieComprobante) { this.serieComprobante = serieComprobante; }
    public String getNumeroComprobante() { return numeroComprobante; }
    public void setNumeroComprobante(String numeroComprobante) { this.numeroComprobante = numeroComprobante; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public BigDecimal getMontoRecibido() { return montoRecibido; }
    public void setMontoRecibido(BigDecimal montoRecibido) { this.montoRecibido = montoRecibido; }
    public BigDecimal getVuelto() { return vuelto; }
    public void setVuelto(BigDecimal vuelto) { this.vuelto = vuelto; }
    public boolean isConfirmacionManualPago() { return confirmacionManualPago; }
    public void setConfirmacionManualPago(boolean confirmacionManualPago) { this.confirmacionManualPago = confirmacionManualPago; }
    public String getPagoConfirmadoPor() { return pagoConfirmadoPor; }
    public void setPagoConfirmadoPor(String pagoConfirmadoPor) { this.pagoConfirmadoPor = pagoConfirmadoPor; }
    public LocalDateTime getPagoConfirmadoEn() { return pagoConfirmadoEn; }
    public void setPagoConfirmadoEn(LocalDateTime pagoConfirmadoEn) { this.pagoConfirmadoEn = pagoConfirmadoEn; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public void setClaveIdempotencia(String claveIdempotencia) { this.claveIdempotencia = claveIdempotencia; }
    public String getHuellaSolicitud() { return huellaSolicitud; }
    public void setHuellaSolicitud(String huellaSolicitud) { this.huellaSolicitud = huellaSolicitud; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public List<DetalleVenta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleVenta> detalles) { this.detalles = detalles; }
}
