package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;

public record AlertaInventarioDto(
        String tipo,
        Long productoId,
        String producto,
        Long loteId,
        String codigoLote,
        LocalDate fechaVencimiento,
        Integer cantidad,
        String prioridad
) {}
