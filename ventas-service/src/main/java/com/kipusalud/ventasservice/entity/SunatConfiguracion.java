package com.kipusalud.ventasservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "sunat_configuraciones")
public class SunatConfiguracion {

    @Id
    @Column(name = "farmacia_id")
    private Long farmaciaId;

    @Column(nullable = false, length = 11)
    private String ruc;

    @Column(name = "razon_social", nullable = false, length = 150)
    private String razonSocial;

    @Column(name = "direccion_fiscal", nullable = false, length = 255)
    private String direccionFiscal;

    @Column(nullable = false, length = 6)
    private String ubigeo;

    @Column(nullable = false, length = 100)
    private String departamento;

    @Column(nullable = false, length = 100)
    private String provincia;

    @Column(nullable = false, length = 100)
    private String distrito;

    @Column(nullable = false, length = 4)
    private String serieFactura;

    @Column(name = "siguiente_numero", nullable = false)
    private Long siguienteNumero = 1L;

    @Column(name = "sol_usuario_cifrado", nullable = false, columnDefinition = "bytea")
    private byte[] solUsuarioCifrado;

    @Column(name = "sol_clave_cifrada", nullable = false, columnDefinition = "bytea")
    private byte[] solClaveCifrada;

    @Column(name = "certificado_cifrado", nullable = false, columnDefinition = "bytea")
    private byte[] certificadoCifrado;

    @Column(name = "certificado_clave_cifrada", nullable = false, columnDefinition = "bytea")
    private byte[] certificadoClaveCifrada;

    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public String getRuc() { return ruc; }
    public void setRuc(String ruc) { this.ruc = ruc; }
    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }
    public String getDireccionFiscal() { return direccionFiscal; }
    public void setDireccionFiscal(String direccionFiscal) { this.direccionFiscal = direccionFiscal; }
    public String getUbigeo() { return ubigeo; }
    public void setUbigeo(String ubigeo) { this.ubigeo = ubigeo; }
    public String getDepartamento() { return departamento; }
    public void setDepartamento(String departamento) { this.departamento = departamento; }
    public String getProvincia() { return provincia; }
    public void setProvincia(String provincia) { this.provincia = provincia; }
    public String getDistrito() { return distrito; }
    public void setDistrito(String distrito) { this.distrito = distrito; }
    public String getSerieFactura() { return serieFactura; }
    public void setSerieFactura(String serieFactura) { this.serieFactura = serieFactura; }
    public Long getSiguienteNumero() { return siguienteNumero; }
    public void setSiguienteNumero(Long siguienteNumero) { this.siguienteNumero = siguienteNumero; }
    public byte[] getSolUsuarioCifrado() { return solUsuarioCifrado; }
    public void setSolUsuarioCifrado(byte[] solUsuarioCifrado) { this.solUsuarioCifrado = solUsuarioCifrado; }
    public byte[] getSolClaveCifrada() { return solClaveCifrada; }
    public void setSolClaveCifrada(byte[] solClaveCifrada) { this.solClaveCifrada = solClaveCifrada; }
    public byte[] getCertificadoCifrado() { return certificadoCifrado; }
    public void setCertificadoCifrado(byte[] certificadoCifrado) { this.certificadoCifrado = certificadoCifrado; }
    public byte[] getCertificadoClaveCifrada() { return certificadoClaveCifrada; }
    public void setCertificadoClaveCifrada(byte[] certificadoClaveCifrada) { this.certificadoClaveCifrada = certificadoClaveCifrada; }
}
