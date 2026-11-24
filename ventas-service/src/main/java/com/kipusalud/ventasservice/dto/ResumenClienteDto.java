package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Compras confirmadas de un cliente en la farmacia actual. */
public record ResumenClienteDto(
        Long clienteId,
        Long compras,
        BigDecimal totalComprado,
        LocalDateTime ultimaCompra
) {}
