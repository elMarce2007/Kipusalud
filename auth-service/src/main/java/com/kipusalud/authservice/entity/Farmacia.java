package com.kipusalud.authservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "farmacias")
public class Farmacia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    protected Farmacia() {}

    public Farmacia(String nombre) {
        this.nombre = nombre;
        this.creadaEn = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
}
