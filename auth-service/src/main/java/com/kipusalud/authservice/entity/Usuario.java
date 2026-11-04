package com.kipusalud.authservice.entity;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String rol;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(nullable = false)
    private boolean activo = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_permisos", joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "permiso", nullable = false, length = 50)
    private Set<String> permisos = new HashSet<>();

    public Usuario() {}

    public Usuario(Long id, String username, String password, String rol, Long farmaciaId) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.rol = rol;
        this.farmaciaId = farmaciaId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public Long getFarmaciaId() { return farmaciaId; }
    public void setFarmaciaId(Long farmaciaId) { this.farmaciaId = farmaciaId; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public Set<String> getPermisos() { return permisos; }
    public void setPermisos(Set<String> permisos) {
        this.permisos = permisos == null ? new HashSet<>() : new HashSet<>(permisos);
    }
}
