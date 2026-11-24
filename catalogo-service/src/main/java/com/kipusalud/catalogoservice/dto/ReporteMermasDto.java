package com.kipusalud.catalogoservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Bajas de inventario (ajustes) de un período. {@code tasaMerma} es el porcentaje
 * de unidades dadas de baja sobre las unidades que salieron (ventas + bajas).
 */
public record ReporteMermasDto(
        LocalDate desde,
        LocalDate hasta,
        int unidadesMerma,
        BigDecimal valorMerma,
        int unidadesVendidas,
        BigDecimal tasaMerma,
        List<PorMotivo> porMotivo,
        List<Fila> filas
) {
    public record PorMotivo(String motivo, int unidades, BigDecimal valor) {}

    public record Fila(
            Long id,
            LocalDateTime fecha,
            Long productoId,
            String producto,
            String codigoLote,
            LocalDate fechaVencimiento,
            String motivo,
            String observacion,
            int cantidad,
            BigDecimal costoUnitario,
            BigDecimal valor,
            String actor
    ) {}
}
