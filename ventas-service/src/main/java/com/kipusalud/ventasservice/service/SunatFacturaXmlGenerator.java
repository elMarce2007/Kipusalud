package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.entity.ComprobanteElectronico;
import com.kipusalud.ventasservice.entity.DetalleVenta;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.entity.Venta;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.crypto.dsig.*;
import javax.xml.crypto.dsig.dom.DOMSignContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory;
import javax.xml.crypto.dsig.keyinfo.X509Data;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Key;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

@Component
public class SunatFacturaXmlGenerator {

    private static final String CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    private static final String CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    private static final String EXT = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";
    private static final String INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
    private static final BigDecimal IGV_RATE = new BigDecimal("0.18");
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    public String generateAndSign(
            Venta venta,
            SunatConfiguracion config,
            SunatConfiguracionService.Credentials credentials,
            ComprobanteElectronico comprobante,
            ClienteClient.ClienteDto cliente
    ) {
        try {
            Document document = buildDocument(venta, config, comprobante, cliente);
            Element extensionContent = (Element) document.getElementsByTagNameNS(EXT, "ExtensionContent").item(0);
            sign(document, extensionContent, credentials);
            return serialize(document);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar o firmar el XML UBL del comprobante", e);
        }
    }

    /** XML UBL sin firmar; separado de la firma para poder verificarlo en pruebas. */
    Document buildDocument(
            Venta venta,
            SunatConfiguracion config,
            ComprobanteElectronico comprobante,
            ClienteClient.ClienteDto cliente
    ) throws Exception {
        List<LineAmounts> lines = calculateLines(venta);
        Document document = newDocument();
        Element root = document.createElementNS(INVOICE, "Invoice");
        document.appendChild(root);
        root.setAttribute("xmlns", INVOICE);
        root.setAttribute("xmlns:cac", CAC);
        root.setAttribute("xmlns:cbc", CBC);
        root.setAttribute("xmlns:ext", EXT);

        Element extensions = append(document, root, EXT, "ext:UBLExtensions");
        Element extension = append(document, extensions, EXT, "ext:UBLExtension");
        append(document, extension, EXT, "ext:ExtensionContent");
        appendText(document, root, CBC, "cbc:UBLVersionID", "2.1");
        appendText(document, root, CBC, "cbc:CustomizationID", "2.0");
        appendText(document, root, CBC, "cbc:ID", comprobante.getSerie() + "-" + comprobante.getNumero());
        appendText(document, root, CBC, "cbc:IssueDate", venta.getFecha().toLocalDate().format(DATE));
        appendText(document, root, CBC, "cbc:IssueTime", venta.getFecha().toLocalTime().format(TIME));
        String tipo = "03".equals(comprobante.getTipoComprobante()) ? "03" : "01";
        Element invoiceType = appendText(document, root, CBC, "cbc:InvoiceTypeCode", tipo);
        invoiceType.setAttribute("listAgencyName", "PE:SUNAT");
        invoiceType.setAttribute("listName", "Tipo de Documento");
        invoiceType.setAttribute("listURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01");
        invoiceType.setAttribute("listID", "0101");
        invoiceType.setAttribute("name", "Tipo de Operacion");
        appendText(document, root, CBC, "cbc:DocumentCurrencyCode", "PEN");
        appendSignatureParty(document, root, config);
        appendSupplier(document, root, config);
        if ("03".equals(tipo)) {
            appendBoletaCustomer(document, root, cliente, venta);
        } else {
            appendCustomer(document, root, cliente);
        }
        appendTaxTotal(document, root, lines);
        appendMonetaryTotal(document, root, lines);
        for (LineAmounts line : lines) {
            appendInvoiceLine(document, root, line);
        }
        return document;
    }

    List<LineAmounts> calculateLines(Venta venta) {
        if (venta.getDetalles() == null || venta.getDetalles().isEmpty()) {
            throw badRequest("La venta no contiene líneas para facturar");
        }
        List<LineAmounts> result = new ArrayList<>();
        BigDecimal total = ZERO;
        int lineNumber = 1;
        for (DetalleVenta detail : venta.getDetalles()) {
            String affected = detail.getAfectacionIgv();
            if (detail.getPrecioIncluyeIgv() == null || detail.getNombreProducto() == null
                    || !List.of("10", "20", "30").contains(affected)) {
                throw badRequest("Cada producto debe tener descripción, afectación IGV y precio con/sin IGV configurados");
            }
            BigDecimal quantity = BigDecimal.valueOf(detail.getCantidad());
            BigDecimal gross = detail.getPrecioUnitario().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net;
            BigDecimal tax;
            if ("10".equals(affected)) {
                if (Boolean.TRUE.equals(detail.getPrecioIncluyeIgv())) {
                    net = gross.divide(BigDecimal.ONE.add(IGV_RATE), 2, RoundingMode.HALF_UP);
                    tax = gross.subtract(net).setScale(2, RoundingMode.HALF_UP);
                } else {
                    net = gross;
                    tax = net.multiply(IGV_RATE).setScale(2, RoundingMode.HALF_UP);
                    gross = net.add(tax).setScale(2, RoundingMode.HALF_UP);
                }
            } else {
                net = gross;
                tax = ZERO;
            }
            result.add(new LineAmounts(lineNumber++, detail, net, tax, gross));
            total = total.add(gross);
        }
        if (total.compareTo(venta.getTotal()) != 0) {
            throw badRequest("El total tributario de las líneas no coincide con el total cobrado en la venta");
        }
        return result;
    }

    private void appendSignatureParty(Document d, Element root, SunatConfiguracion config) {
        Element signature = append(d, root, CAC, "cac:Signature");
        appendText(d, signature, CBC, "cbc:ID", config.getRuc());
        Element party = append(d, signature, CAC, "cac:SignatoryParty");
        Element identification = append(d, party, CAC, "cac:PartyIdentification");
        appendText(d, identification, CBC, "cbc:ID", config.getRuc());
        Element legal = append(d, party, CAC, "cac:PartyName");
        appendText(d, legal, CBC, "cbc:Name", config.getRazonSocial());
        Element attachment = append(d, signature, CAC, "cac:DigitalSignatureAttachment");
        Element external = append(d, attachment, CAC, "cac:ExternalReference");
        appendText(d, external, CBC, "cbc:URI", "#SignatureSP");
    }

    private void appendSupplier(Document d, Element root, SunatConfiguracion config) {
        Element supplier = append(d, root, CAC, "cac:AccountingSupplierParty");
        Element party = append(d, supplier, CAC, "cac:Party");
        Element id = append(d, append(d, party, CAC, "cac:PartyIdentification"), CBC, "cbc:ID");
        id.setAttribute("schemeID", "6");
        id.setTextContent(config.getRuc());
        Element legal = append(d, party, CAC, "cac:PartyLegalEntity");
        appendText(d, legal, CBC, "cbc:RegistrationName", config.getRazonSocial());
        appendAddress(d, legal, config.getDireccionFiscal(), config.getUbigeo(), config.getProvincia(),
                config.getDepartamento(), config.getDistrito());
    }

    private void appendCustomer(Document d, Element root, ClienteClient.ClienteDto cliente) {
        if (cliente == null || cliente.ruc() == null || !cliente.ruc().matches("\\d{11}")
                || cliente.razonSocial() == null || cliente.razonSocial().isBlank()
                || cliente.direccionFiscal() == null || cliente.direccionFiscal().isBlank()) {
            throw badRequest("La factura requiere RUC, razón social y domicilio fiscal del cliente");
        }
        Element customer = append(d, root, CAC, "cac:AccountingCustomerParty");
        Element party = append(d, customer, CAC, "cac:Party");
        Element id = append(d, append(d, party, CAC, "cac:PartyIdentification"), CBC, "cbc:ID");
        id.setAttribute("schemeID", "6");
        id.setTextContent(cliente.ruc());
        Element legal = append(d, party, CAC, "cac:PartyLegalEntity");
        appendText(d, legal, CBC, "cbc:RegistrationName", cliente.razonSocial());
        Element postal = append(d, legal, CAC, "cac:RegistrationAddress");
        appendText(d, postal, CAC, "cac:AddressLine", cliente.direccionFiscal());
        Element country = append(d, postal, CAC, "cac:Country");
        appendText(d, country, CBC, "cbc:IdentificationCode", "PE");
    }

    /**
     * Adquiriente de una boleta (catálogo 06 de SUNAT): DNI ("1") si el cliente lo tiene; si
     * no, "-" (varios), permitido solo para ventas menores a S/ 700.
     */
    private void appendBoletaCustomer(Document d, Element root, ClienteClient.ClienteDto cliente, Venta venta) {
        boolean conDni = cliente != null && cliente.dni() != null && cliente.dni().trim().matches("\\d{8}");
        if (!conDni && venta.getTotal().compareTo(SunatConfiguracionService.MONTO_MINIMO_BOLETA_CON_DOCUMENTO) >= 0) {
            throw badRequest("Una boleta desde S/ 700 requiere el DNI del cliente");
        }
        Element customer = append(d, root, CAC, "cac:AccountingCustomerParty");
        Element party = append(d, customer, CAC, "cac:Party");
        Element id = append(d, append(d, party, CAC, "cac:PartyIdentification"), CBC, "cbc:ID");
        id.setAttribute("schemeID", conDni ? "1" : "-");
        id.setTextContent(conDni ? cliente.dni().trim() : "-");
        Element legal = append(d, party, CAC, "cac:PartyLegalEntity");
        String nombre = conDni
                ? (nullToEmpty(cliente.nombres()) + " " + nullToEmpty(cliente.apellidos())).trim()
                : "CLIENTES VARIOS";
        appendText(d, legal, CBC, "cbc:RegistrationName", nombre.isBlank() ? "CLIENTES VARIOS" : nombre);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private void appendAddress(
            Document d, Element legal, String address, String ubigeo, String province, String department, String district
    ) {
        Element postal = append(d, legal, CAC, "cac:RegistrationAddress");
        appendText(d, postal, CBC, "cbc:ID", ubigeo);
        appendText(d, postal, CBC, "cbc:CityName", province);
        appendText(d, postal, CBC, "cbc:CountrySubentity", department);
        appendText(d, postal, CBC, "cbc:District", district);
        appendText(d, append(d, postal, CAC, "cac:AddressLine"), CBC, "cbc:Line", address);
        Element country = append(d, postal, CAC, "cac:Country");
        appendText(d, country, CBC, "cbc:IdentificationCode", "PE");
    }

    private void appendTaxTotal(Document d, Element parent, List<LineAmounts> lines) {
        Element total = append(d, parent, CAC, "cac:TaxTotal");
        BigDecimal taxSum = lines.stream().map(LineAmounts::tax).reduce(ZERO, BigDecimal::add);
        amount(d, total, CBC, "cbc:TaxAmount", taxSum);
        for (String category : List.of("10", "20", "30")) {
            List<LineAmounts> group = lines.stream()
                    .filter(line -> category.equals(line.detail().getAfectacionIgv())).toList();
            if (group.isEmpty()) continue;
            String schemeId = taxSchemeId(category);
            Element subtotal = append(d, total, CAC, "cac:TaxSubtotal");
            amount(d, subtotal, CBC, "cbc:TaxableAmount",
                    group.stream().map(LineAmounts::net).reduce(ZERO, BigDecimal::add));
            amount(d, subtotal, CBC, "cbc:TaxAmount",
                    group.stream().map(LineAmounts::tax).reduce(ZERO, BigDecimal::add));
            Element taxCategory = append(d, subtotal, CAC, "cac:TaxCategory");
            appendText(d, taxCategory, CBC, "cbc:ID", categoryId(category));
            appendText(d, taxCategory, CBC, "cbc:Percent", "10".equals(category) ? "18.00" : "0.00");
            appendText(d, taxCategory, CBC, "cbc:TaxExemptionReasonCode", category);
            appendTaxScheme(d, taxCategory, schemeId, category);
        }
    }

    private void appendMonetaryTotal(Document d, Element root, List<LineAmounts> lines) {
        BigDecimal net = lines.stream().map(LineAmounts::net).reduce(ZERO, BigDecimal::add);
        BigDecimal gross = lines.stream().map(LineAmounts::gross).reduce(ZERO, BigDecimal::add);
        Element total = append(d, root, CAC, "cac:LegalMonetaryTotal");
        amount(d, total, CBC, "cbc:LineExtensionAmount", net);
        amount(d, total, CBC, "cbc:TaxInclusiveAmount", gross);
        amount(d, total, CBC, "cbc:PayableAmount", gross);
    }

    private void appendInvoiceLine(Document d, Element root, LineAmounts line) {
        Element invoiceLine = append(d, root, CAC, "cac:InvoiceLine");
        appendText(d, invoiceLine, CBC, "cbc:ID", Integer.toString(line.number()));
        Element quantity = appendText(d, invoiceLine, CBC, "cbc:InvoicedQuantity",
                Integer.toString(line.detail().getCantidad()));
        quantity.setAttribute("unitCode", "NIU");
        amount(d, invoiceLine, CBC, "cbc:LineExtensionAmount", line.net());

        Element taxTotal = append(d, invoiceLine, CAC, "cac:TaxTotal");
        amount(d, taxTotal, CBC, "cbc:TaxAmount", line.tax());
        Element subtotal = append(d, taxTotal, CAC, "cac:TaxSubtotal");
        amount(d, subtotal, CBC, "cbc:TaxableAmount", line.net());
        amount(d, subtotal, CBC, "cbc:TaxAmount", line.tax());
        Element category = append(d, subtotal, CAC, "cac:TaxCategory");
        String taxType = line.detail().getAfectacionIgv();
        appendText(d, category, CBC, "cbc:ID", categoryId(taxType));
        appendText(d, category, CBC, "cbc:Percent", "10".equals(taxType) ? "18.00" : "0.00");
        appendText(d, category, CBC, "cbc:TaxExemptionReasonCode", taxType);
        appendTaxScheme(d, category, taxSchemeId(taxType), taxType);

        Element item = append(d, invoiceLine, CAC, "cac:Item");
        appendText(d, item, CBC, "cbc:Description", line.detail().getNombreProducto());
        Element price = append(d, invoiceLine, CAC, "cac:Price");
        BigDecimal priceAmount = line.detail().getPrecioUnitario();
        if ("10".equals(taxType) && Boolean.FALSE.equals(line.detail().getPrecioIncluyeIgv())) {
            priceAmount = priceAmount.multiply(BigDecimal.ONE.add(IGV_RATE)).setScale(2, RoundingMode.HALF_UP);
        }
        amount(d, price, CBC, "cbc:PriceAmount", priceAmount);
    }

    private void appendTaxScheme(Document d, Element parent, String code, String affected) {
        Element scheme = append(d, parent, CAC, "cac:TaxScheme");
        appendText(d, scheme, CBC, "cbc:ID", code);
        appendText(d, scheme, CBC, "cbc:Name", "10".equals(affected) ? "IGV" : "20".equals(affected) ? "EXO" : "INA");
        appendText(d, scheme, CBC, "cbc:TaxTypeCode", "VAT");
    }

    private String taxSchemeId(String affected) {
        return switch (affected) {
            case "10" -> "1000";
            case "20" -> "9997";
            case "30" -> "9998";
            default -> throw badRequest("Afectación de IGV no admitida");
        };
    }

    private String categoryId(String affected) {
        return switch (affected) {
            case "10" -> "S";
            case "20" -> "E";
            case "30" -> "O";
            default -> throw badRequest("Afectación de IGV no admitida");
        };
    }

    private void sign(Document document, Element extensionContent, SunatConfiguracionService.Credentials credentials)
            throws Exception {
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(new ByteArrayInputStream(credentials.certificado()), credentials.claveCertificado().toCharArray());
        Enumeration<String> aliases = keyStore.aliases();
        String alias = null;
        while (aliases.hasMoreElements()) {
            String candidate = aliases.nextElement();
            if (keyStore.isKeyEntry(candidate)) {
                alias = candidate;
                break;
            }
        }
        if (alias == null) throw new IllegalStateException("El certificado no tiene clave privada");
        Key key = keyStore.getKey(alias, credentials.claveCertificado().toCharArray());
        if (!(key instanceof PrivateKey privateKey)) throw new IllegalStateException("La clave del certificado no es privada");
        X509Certificate certificate = (X509Certificate) keyStore.getCertificate(alias);
        XMLSignatureFactory factory = XMLSignatureFactory.getInstance("DOM");
        List<Transform> transforms = List.of(
                factory.newTransform(Transform.ENVELOPED, (javax.xml.crypto.dsig.spec.TransformParameterSpec) null),
                factory.newTransform(CanonicalizationMethod.INCLUSIVE,
                        (javax.xml.crypto.dsig.spec.TransformParameterSpec) null)
        );
        Reference reference = factory.newReference("",
                factory.newDigestMethod(DigestMethod.SHA256, null), transforms, null, null);
        SignedInfo signedInfo = factory.newSignedInfo(
                factory.newCanonicalizationMethod(CanonicalizationMethod.INCLUSIVE,
                        (javax.xml.crypto.dsig.spec.C14NMethodParameterSpec) null),
                factory.newSignatureMethod(SignatureMethod.RSA_SHA256, null),
                List.of(reference));
        KeyInfoFactory keyInfoFactory = factory.getKeyInfoFactory();
        X509Data x509Data = keyInfoFactory.newX509Data(List.of(certificate));
        KeyInfo keyInfo = keyInfoFactory.newKeyInfo(List.of(x509Data));
        DOMSignContext signContext = new DOMSignContext(privateKey, extensionContent);
        signContext.setDefaultNamespacePrefix("ds");
        factory.newXMLSignature(signedInfo, keyInfo, null, "SignatureSP", null).sign(signContext);
    }

    private Document newDocument() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory.newDocumentBuilder().newDocument();
    }

    private String serialize(Document document) throws Exception {
        var transformer = TransformerFactory.newInstance().newTransformer();
        transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
        transformer.setOutputProperty(OutputKeys.INDENT, "no");
        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(document), new StreamResult(writer));
        return writer.toString();
    }

    private Element append(Document d, Element parent, String namespace, String name) {
        Element element = d.createElementNS(namespace, name);
        parent.appendChild(element);
        return element;
    }

    private Element appendText(Document d, Element parent, String namespace, String name, String value) {
        Element element = append(d, parent, namespace, name);
        element.setTextContent(value);
        return element;
    }

    private void amount(Document d, Element parent, String namespace, String name, BigDecimal value) {
        Element element = appendText(d, parent, namespace, name, value.setScale(2, RoundingMode.HALF_UP).toPlainString());
        element.setAttribute("currencyID", "PEN");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    record LineAmounts(int number, DetalleVenta detail, BigDecimal net, BigDecimal tax, BigDecimal gross) {}
}
