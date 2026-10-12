package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.entity.DetalleVenta;
import com.kipusalud.ventasservice.entity.Venta;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SunatFacturaXmlGeneratorTest {

    private final SunatFacturaXmlGenerator generator = new SunatFacturaXmlGenerator();

    @Test
    void separatesIgvWhenProductPriceAlreadyIncludesIt() {
        Venta venta = venta("20.00", "10.00", 2, "10", true);

        var line = generator.calculateLines(venta).get(0);

        assertEquals(new BigDecimal("16.95"), line.net());
        assertEquals(new BigDecimal("3.05"), line.tax());
        assertEquals(new BigDecimal("20.00"), line.gross());
    }

    @Test
    void addsIgvWhenProductPriceExcludesIt() {
        Venta venta = venta("23.60", "10.00", 2, "10", false);

        var line = generator.calculateLines(venta).get(0);

        assertEquals(new BigDecimal("20.00"), line.net());
        assertEquals(new BigDecimal("3.60"), line.tax());
        assertEquals(new BigDecimal("23.60"), line.gross());
    }

    @Test
    void refusesLinesWithoutExplicitTaxConfiguration() {
        Venta venta = venta("10.00", "10.00", 1, null, null);

        assertThrows(ResponseStatusException.class, () -> generator.calculateLines(venta));
    }

    @Test
    void doesNotAddIgvToExemptOrUnaffectedOperations() {
        for (String affectation : List.of("20", "30")) {
            Venta venta = venta("20.00", "10.00", 2, affectation, false);

            var line = generator.calculateLines(venta).get(0);

            assertEquals(new BigDecimal("20.00"), line.net());
            assertEquals(new BigDecimal("0.00"), line.tax());
            assertEquals(new BigDecimal("20.00"), line.gross());
        }
    }

    @Test
    void refusesTaxAmountsThatDoNotMatchCollectedSaleTotal() {
        Venta venta = venta("20.00", "10.00", 2, "10", false);

        assertThrows(ResponseStatusException.class, () -> generator.calculateLines(venta));
    }

    private Venta venta(String total, String price, int quantity, String affected, Boolean priceIncludesTax) {
        DetalleVenta detail = new DetalleVenta();
        detail.setNombreProducto("Medicamento");
        detail.setCantidad(quantity);
        detail.setPrecioUnitario(new BigDecimal(price));
        detail.setAfectacionIgv(affected);
        detail.setPrecioIncluyeIgv(priceIncludesTax);
        Venta venta = new Venta();
        venta.setTotal(new BigDecimal(total));
        venta.setDetalles(List.of(detail));
        return venta;
    }
}
