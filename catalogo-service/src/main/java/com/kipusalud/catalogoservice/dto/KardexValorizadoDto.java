package com.kipusalud.catalogoservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Kardex físico-valorizado de un producto en un período. El valor de cada
 * movimiento es cantidad × costo unitario de su lote; los movimientos de lotes
 * sin costo suman unidades pero no valor ({@code unidadesSinCosto}).
 */
public record KardexValorizadoDto(
        Long productoId,
        String producto,
        String principioActivo,
        String presentacion,
        String registroSanitario,
        LocalDate desde,
        LocalDate hasta,
        int saldoInicialUnidades,
        BigDecimal saldoInicialValor,
        int totalEntradas,
        int totalSalidas,
        int saldoFinalUnidades,
        BigDecimal saldoFinalValor,
        BigDecimal costoPromedio,
        int unidadesSinCosto,
        List<Fila> filas
) {
    public record Fila(
            Long id,
            LocalDateTime fecha,
            String tipo,
            String referencia,
            String codigoLote,
            LocalDate fechaVencimiento,
            int entrada,
            int salida,
            int saldoUnidades,
            BigDecimal costoUnitario,
            BigDecimal saldoValor,
            String actor
    ) {}
}
