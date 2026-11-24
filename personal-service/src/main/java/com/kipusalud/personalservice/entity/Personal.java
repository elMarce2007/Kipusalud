package com.kipusalud.personalservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "personal")
public class Personal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombres;

    @Column(nullable = false, length = 100)
    private String apellidos;

    @Column(length = 50)
    private String cargo;

    @Column(length = 100)
    private String email;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(length = 8)
    private String dni;

    /** Número de colegiatura (CQFP) del químico farmacéutico. */
    @Column(length = 20)
    private String colegiatura;

    @Column(length = 20)
    private String telefono;

    /** MANANA, TARDE, NOCHE o ROTATIVO. */
    @Column(length = 20)
    private String turno;

    @Column(nullable = false)
    private boolean activo = true;

    public String getDni() { return dni; }
    public void setDni(String dni) { this.dni = dni; }
    public String getColegiatura() { return colegiatura; }
    public void setColegiatura(String colegiatura) { this.colegiatura = colegiatura; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    public Personal() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombres() { return nombres; }
    public void setNombres(String nombres) { this.nombres = nombres; }
    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }
    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
}
