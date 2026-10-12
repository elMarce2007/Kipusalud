package com.kipusalud.ventasservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comprobantes_electronicos",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_comprobante_venta", columnNames = {"farmacia_id", "venta_id"}),
                @UniqueConstraint(name = "uk_comprobante_numero",
                        columnNames = {"farmacia_id", "tipo_comprobante", "serie", "numero"})
        })
public class ComprobanteElectronico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "venta_id", nullable = false)
    private Long ventaId;

    @Column(name = "tipo_comprobante", nullable = false, length = 2)
    private String tipoComprobante = "01";

    @Column(nullable = false, length = 4)
    private String serie;

    @Column(nullable = false, length = 8)
    private String numero;

    @Column(nullable = false, length = 30)
    private String estado;

    @Column(name = "nombre_archivo", nullable = false, length = 80)
    private String nombreArchivo;

    @Column(name = "xml_firmado", nullable = false, columnDefinition = "text")
    private String xmlFirmado;

    @Column(name = "cdr_zip", columnDefinition = "bytea")
    private byte[] cdrZip;

    @Column(name = "codigo_respuesta", length = 20)
    private String codigoRespuesta;

    @Column(name = "descripcion_respuesta", length = 1000)
    private String descripcionRespuesta;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_respuesta")
    private LocalDateTime fechaRespuesta;

    public Long getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public Long getVentaId() { return ventaId; }
    public void setVentaId(Long ventaId) { this.ventaId = ventaId; }
    public String getTipoComprobante() { return tipoComprobante; }
    public String getSerie() { return serie; }
    public void setSerie(String serie) { this.serie = serie; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public String getXmlFirmado() { return xmlFirmado; }
    public void setXmlFirmado(String xmlFirmado) { this.xmlFirmado = xmlFirmado; }
    public byte[] getCdrZip() { return cdrZip; }
    public void setCdrZip(byte[] cdrZip) { this.cdrZip = cdrZip; }
    public String getCodigoRespuesta() { return codigoRespuesta; }
    public void setCodigoRespuesta(String codigoRespuesta) { this.codigoRespuesta = codigoRespuesta; }
    public String getDescripcionRespuesta() { return descripcionRespuesta; }
    public void setDescripcionRespuesta(String descripcionRespuesta) { this.descripcionRespuesta = descripcionRespuesta; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDateTime fechaRespuesta) { this.fechaRespuesta = fechaRespuesta; }
}
