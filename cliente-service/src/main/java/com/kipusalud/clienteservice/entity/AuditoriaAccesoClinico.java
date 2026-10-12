package com.kipusalud.clienteservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_acceso_clinico")
public class AuditoriaAccesoClinico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(nullable = false, length = 50)
    private String usuario;

    @Column(nullable = false, length = 20)
    private String accion;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    protected AuditoriaAccesoClinico() {}

    public AuditoriaAccesoClinico(Long farmaciaId, Long clienteId, String usuario, String accion) {
        this.farmaciaId = farmaciaId;
        this.clienteId = clienteId;
        this.usuario = usuario;
        this.accion = accion;
        this.creadoEn = LocalDateTime.now();
    }
}
