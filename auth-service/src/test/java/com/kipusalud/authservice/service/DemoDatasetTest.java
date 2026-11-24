package com.kipusalud.authservice.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Coherencia de los datos de la farmacia de demostración. */
class DemoDatasetTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 11, 24, 16, 30);
    private static final DemoDataset.Usuarios USUARIOS = new DemoDataset.Usuarios("admin", "gerente", "qf", "cajero");

    @Test
    void cadaLoteCuadraConSusVentasYBajas() {
        for (long semilla : new long[]{1L, 27L, 4_000_123L}) {
            DemoDataset d = DemoDataset.generar(semilla, AHORA, USUARIOS);
            for (int i = 0; i < d.lotes.size(); i++) {
                final int lote = i;
                int vendido = d.ventas.stream().flatMap(v -> v.lineas().stream()).flatMap(l -> l.lotes().stream())
                        .filter(a -> a.lote() == lote).mapToInt(DemoDataset.Asignacion::cantidad).sum();
                int bajas = d.ajustes.stream().filter(a -> a.lote() == lote).mapToInt(DemoDataset.Ajuste::cantidad).sum();
                DemoDataset.Lote l = d.lotes.get(i);
                assertEquals(l.inicial - vendido - bajas, l.disponible, "lote " + l.codigo);
                assertTrue(l.disponible >= 0);
            }
        }
    }

    @Test
    void lasVentasRespetanFefoFechasYTotales() {
        DemoDataset d = DemoDataset.generar(42L, AHORA, USUARIOS);

        assertTrue(d.ventas.size() > 120, "un mes de ventas");
        for (int i = 0; i < d.ventas.size(); i++) {
            DemoDataset.Venta v = d.ventas.get(i);
            assertEquals(i + 1, v.numero());
            assertTrue(v.fecha().isBefore(AHORA));
            if (i > 0) assertFalse(v.fecha().isBefore(d.ventas.get(i - 1).fecha()));
            BigDecimal suma = v.lineas().stream().map(DemoDataset.Linea::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            assertEquals(0, suma.compareTo(v.total()));
            assertEquals(0, v.recibido().subtract(v.total()).compareTo(v.vuelto()));
            assertTrue(v.vuelto().signum() >= 0);
            for (DemoDataset.Linea linea : v.lineas()) {
                assertEquals(linea.cantidad(), linea.lotes().stream().mapToInt(DemoDataset.Asignacion::cantidad).sum());
                for (DemoDataset.Asignacion a : linea.lotes()) {
                    DemoDataset.Lote lote = d.lotes.get(a.lote());
                    assertEquals(linea.producto(), lote.producto);
                    assertFalse(lote.creado.isAfter(v.fecha()), "lote recibido antes de venderse");
                    assertFalse(lote.vence.isBefore(v.fecha().toLocalDate()), "no se venden lotes vencidos");
                }
            }
        }
        Set<String> turnos = d.ventas.stream().map(v -> {
            int h = v.fecha().getHour();
            return h >= 7 && h < 15 ? "M" : h >= 15 && h < 23 ? "T" : "N";
        }).collect(Collectors.toSet());
        assertEquals(Set.of("M", "T", "N"), turnos);
        assertEquals(Set.of("cajero", "qf", "gerente"), d.ventas.stream().map(DemoDataset.Venta::vendedor)
                .collect(Collectors.toSet()));
    }

    @Test
    void incluyeAlertasRealistas() {
        DemoDataset d = DemoDataset.generar(42L, AHORA, USUARIOS);
        LocalDate hoy = AHORA.toLocalDate();

        assertTrue(d.lotes.stream().anyMatch(l -> l.vence.isBefore(hoy) && l.disponible > 0), "unidades vencidas");
        assertTrue(d.lotes.stream().anyMatch(l -> !l.vence.isBefore(hoy) && l.vence.isBefore(hoy.plusDays(60))
                && l.disponible > 0), "lotes por vencer");
        long bajoMinimo = java.util.stream.IntStream.range(0, d.productos.size())
                .filter(p -> d.stockDe(p) < d.stockMinimo.get(p)).count();
        assertTrue(bajoMinimo >= 1, "algún producto por reponer");
        assertEquals(4, d.ajustes.size());
        assertTrue(d.categorias.stream().anyMatch(c -> "RECETA_RETENIDA".equals(c.condicionVenta())));
    }

    @Test
    void documentosYCodigosSonUnicosYValidos() {
        DemoDataset d = DemoDataset.generar(7L, AHORA, USUARIOS);
        List<String> barras = d.productos.stream().map(DemoDataset.Producto::codigoBarras).toList();
        assertEquals(barras.size(), new HashSet<>(barras).size());
        for (String ean : barras) {
            int suma = 0;
            for (int i = 0; i < 12; i++) suma += (ean.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
            assertEquals((10 - suma % 10) % 10, ean.charAt(12) - '0');
        }
        List<String> dnis = d.clientes.stream().map(DemoDataset.Cliente::dni).toList();
        assertEquals(dnis.size(), new HashSet<>(dnis).size());
        assertTrue(dnis.stream().allMatch(x -> x.matches("\\d{8}")));
        assertTrue(d.clientes.stream().filter(c -> c.ruc() != null).allMatch(c -> c.ruc().matches("20\\d{9}")));
        assertTrue(d.personal.stream().map(DemoDataset.Colaborador::dni).allMatch(x -> x.matches("\\d{8}")));
        assertEquals(DemoDataset.generar(7L, AHORA, USUARIOS).ventas.size(), d.ventas.size(), "determinista");
    }
}
