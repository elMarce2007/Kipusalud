package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.entity.ComprobanteElectronico;
import com.kipusalud.ventasservice.entity.DetalleVenta;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.entity.Venta;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Estructura UBL según el tipo de comprobante (sin firma digital). */
class SunatComprobanteXmlTest {

    private static final String CBC =
            "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

    private final SunatFacturaXmlGenerator generator = new SunatFacturaXmlGenerator();

    @Test
    void boletaConDniIdentificaAlClienteConTipoDocumento1() throws Exception {
        Document xml = generator.buildDocument(venta("50.00"), config(), comprobante("03"),
                cliente("12345678", null));

        assertEquals("03", texto(xml, "InvoiceTypeCode", 0));
        Element id = clienteId(xml);
        assertEquals("1", id.getAttribute("schemeID"));
        assertEquals("12345678", id.getTextContent());
    }

    @Test
    void boletaMenorA700SinClienteUsaClientesVarios() throws Exception {
        Document xml = generator.buildDocument(venta("50.00"), config(), comprobante("03"), null);

        Element id = clienteId(xml);
        assertEquals("-", id.getAttribute("schemeID"));
        assertEquals("CLIENTES VARIOS", texto(xml, "RegistrationName", 1));
    }

    @Test
    void boletaDesde700ExigeDni() {
        assertThrows(ResponseStatusException.class, () ->
                generator.buildDocument(venta("700.00"), config(), comprobante("03"), null));
    }

    @Test
    void facturaIdentificaAlClienteConRuc() throws Exception {
        Document xml = generator.buildDocument(venta("50.00"), config(), comprobante("01"),
                cliente(null, "20100000001"));

        assertEquals("01", texto(xml, "InvoiceTypeCode", 0));
        Element id = clienteId(xml);
        assertEquals("6", id.getAttribute("schemeID"));
        assertEquals("20100000001", id.getTextContent());
    }

    @Test
    void facturaSinRucSeRechaza() {
        assertThrows(ResponseStatusException.class, () ->
                generator.buildDocument(venta("50.00"), config(), comprobante("01"), cliente("12345678", null)));
    }

    private Element clienteId(Document xml) {
        Element customer = (Element) xml.getElementsByTagNameNS("*", "AccountingCustomerParty").item(0);
        return (Element) customer.getElementsByTagNameNS(CBC, "ID").item(0);
    }

    private String texto(Document xml, String localName, int index) {
        return xml.getElementsByTagNameNS(CBC, localName).item(index).getTextContent();
    }

    private Venta venta(String total) {
        DetalleVenta detalle = new DetalleVenta();
        detalle.setNombreProducto("Paracetamol");
        detalle.setCantidad(1);
        detalle.setPrecioUnitario(new BigDecimal(total));
        detalle.setAfectacionIgv("10");
        detalle.setPrecioIncluyeIgv(true);
        Venta venta = new Venta();
        venta.setFecha(LocalDateTime.of(2026, 11, 23, 10, 30));
        venta.setTotal(new BigDecimal(total));
        venta.setDetalles(List.of(detalle));
        return venta;
    }

    private SunatConfiguracion config() {
        SunatConfiguracion config = new SunatConfiguracion();
        config.setRuc("20999999991");
        config.setRazonSocial("Botica Prueba SAC");
        config.setDireccionFiscal("Av. Prueba 123");
        config.setUbigeo("150101");
        config.setDepartamento("Lima");
        config.setProvincia("Lima");
        config.setDistrito("Lima");
        return config;
    }

    private ComprobanteElectronico comprobante(String tipo) {
        ComprobanteElectronico comprobante = new ComprobanteElectronico();
        comprobante.setTipoComprobante(tipo);
        comprobante.setSerie("03".equals(tipo) ? "B001" : "F001");
        comprobante.setNumero("00000001");
        return comprobante;
    }

    private ClienteClient.ClienteDto cliente(String dni, String ruc) {
        return new ClienteClient.ClienteDto(1L, "Ana", "Demo", dni, "999999999", "ana@example.invalid",
                ruc, ruc == null ? null : "Clínica Demo SAC", ruc == null ? null : "Av. Demo 1");
    }
}
