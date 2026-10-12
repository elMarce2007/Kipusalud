package com.kipusalud.clienteservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "informacion_clinica_clientes")
public class InformacionClinicaCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(columnDefinition = "TEXT")
    private String diagnosticos;

    @Column(columnDefinition = "TEXT")
    private String tratamientos;

    @Column(columnDefinition = "TEXT")
    private String alergias;

    @Column(columnDefinition = "TEXT")
    private String medicamentos;

    public Long getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getDiagnosticos() { return diagnosticos; }
    public void setDiagnosticos(String diagnosticos) { this.diagnosticos = diagnosticos; }
    public String getTratamientos() { return tratamientos; }
    public void setTratamientos(String tratamientos) { this.tratamientos = tratamientos; }
    public String getAlergias() { return alergias; }
    public void setAlergias(String alergias) { this.alergias = alergias; }
    public String getMedicamentos() { return medicamentos; }
    public void setMedicamentos(String medicamentos) { this.medicamentos = medicamentos; }
}
