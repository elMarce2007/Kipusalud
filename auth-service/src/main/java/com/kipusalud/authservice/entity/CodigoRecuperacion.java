package com.kipusalud.authservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** Código de recuperación de contraseña (solo se guarda su hash). */
@Entity
@Table(name = "codigos_recuperacion")
public class CodigoRecuperacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "codigo_hash", nullable = false, length = 100)
    private String codigoHash;

    @Column(nullable = false)
    private int intentos;

    @Column(name = "expira_en", nullable = false)
    private Instant expiraEn;

    @Column(name = "usado_en")
    private Instant usadoEn;

    @Column(name = "creado_por", nullable = false, length = 50)
    private String creadoPor;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    protected CodigoRecuperacion() {}

    public CodigoRecuperacion(Long usuarioId, Long farmaciaId, String codigoHash, Instant expiraEn,
                              String creadoPor, Instant creadoEn) {
        this.usuarioId = usuarioId;
        this.farmaciaId = farmaciaId;
        this.codigoHash = codigoHash;
        this.expiraEn = expiraEn;
        this.creadoPor = creadoPor;
        this.creadoEn = creadoEn;
    }

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public Long getFarmaciaId() { return farmaciaId; }
    public String getCodigoHash() { return codigoHash; }
    public int getIntentos() { return intentos; }
    public void registrarIntentoFallido() { intentos++; }
    public Instant getExpiraEn() { return expiraEn; }
    public Instant getUsadoEn() { return usadoEn; }
    public void marcarUsado(Instant cuando) { usadoEn = cuando; }
}
