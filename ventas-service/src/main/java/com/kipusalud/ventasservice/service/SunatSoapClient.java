package com.kipusalud.ventasservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class SunatSoapClient {

    private static final String SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
    private static final String SERVICE_NAMESPACE = "http://service.sunat.gob.pe";

    private final RestClient restClient;
    private final String environment;
    private final String betaUrl;
    private final String productionUrl;
    private final boolean productionEnabled;

    public SunatSoapClient(
            RestClient.Builder builder,
            @Value("${sunat.environment:BETA}") String environment,
            @Value("${sunat.beta-url:https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService}") String betaUrl,
            @Value("${sunat.production-url:}") String productionUrl,
            @Value("${sunat.production-enabled:false}") boolean productionEnabled
    ) {
        this.restClient = builder.build();
        this.environment = environment.trim().toUpperCase();
        this.betaUrl = betaUrl;
        this.productionUrl = productionUrl;
        this.productionEnabled = productionEnabled;
    }

    public byte[] sendBill(
            String ruc,
            String usuarioSol,
            String claveSol,
            String nombreArchivo,
            byte[] archivoZip
    ) throws SunatSoapException {
        String endpoint = endpoint();
        String payload = soapEnvelope(ruc, usuarioSol, claveSol, nombreArchivo, archivoZip);
        try {
            String response = call(endpoint, "urn:sendBill", payload);
            return extractApplicationResponse(response);
        } catch (SunatSoapException e) {
            throw e;
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "No se pudo confirmar el resultado del envío a SUNAT; no reenvíe la factura hasta consultar su estado",
                    e);
        }
    }

    public StatusResult getStatusAR(
            String ruc,
            String usuarioSol,
            String claveSol,
            String tipoComprobante,
            String serie,
            String numero
    ) throws SunatSoapException {
        String request = """
                <ser:getStatusAR>
                  <rucComprobante>%s</rucComprobante>
                  <tipoComprobante>%s</tipoComprobante>
                  <serieComprobante>%s</serieComprobante>
                  <numeroComprobante>%s</numeroComprobante>
                </ser:getStatusAR>
                """.formatted(escape(ruc), escape(tipoComprobante), escape(serie), escape(numero));
        String payload = soapEnvelope(ruc, usuarioSol, claveSol, request);
        try {
            String response = call(endpoint(), "urn:getStatusAR", payload);
            Document document = parse(response);
            if (document.getElementsByTagNameNS(SOAP_NAMESPACE, "Fault").getLength() > 0) {
                throw new SunatSoapException(text(document, "faultcode"), text(document, "faultstring"));
            }
            String statusCode = text(document, "statusCode");
            String statusMessage = text(document, "statusMessage");
            String content = text(document, "content");
            byte[] cdr = content == null || content.isBlank() ? null : Base64.getMimeDecoder().decode(content.trim());
            return new StatusResult(statusCode, statusMessage, cdr);
        } catch (SunatSoapException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo consultar el estado del comprobante en SUNAT", e);
        }
    }

    private String endpoint() {
        if ("BETA".equals(environment)) return betaUrl;
        if ("PRODUCCION".equals(environment) || "PRODUCTION".equals(environment)) {
            if (!productionEnabled || productionUrl.isBlank()) {
                throw new IllegalStateException(
                        "La emisión en producción requiere SUNAT_PRODUCTION_ENABLED=true y un endpoint verificado");
            }
            return productionUrl;
        }
        throw new IllegalStateException("SUNAT_ENVIRONMENT debe ser BETA o PRODUCCION");
    }

    static String soapEnvelope(
            String ruc, String username, String password, String fileName, byte[] zip
    ) {
        String request = """
                <ser:sendBill>
                  <fileName>%s</fileName>
                  <contentFile>%s</contentFile>
                </ser:sendBill>
                """.formatted(escape(fileName), Base64.getEncoder().encodeToString(zip));
        return soapEnvelope(ruc, username, password, request);
    }

    private static String soapEnvelope(String ruc, String username, String password, String operationXml) {
        String tokenUsername = ruc + username;
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <soapenv:Envelope xmlns:soapenv="%s" xmlns:ser="%s"
                    xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                    xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                  <soapenv:Header>
                    <wsse:Security soapenv:mustUnderstand="1">
                      <wsse:UsernameToken wsu:Id="UsernameToken-1">
                        <wsse:Username>%s</wsse:Username>
                        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">%s</wsse:Password>
                      </wsse:UsernameToken>
                    </wsse:Security>
                  </soapenv:Header>
                  <soapenv:Body>
                    %s
                  </soapenv:Body>
                </soapenv:Envelope>
                """.formatted(SOAP_NAMESPACE, SERVICE_NAMESPACE, escape(tokenUsername),
                escape(password), operationXml);
    }

    private byte[] extractApplicationResponse(String response) throws SunatSoapException {
        try {
            Document document = parse(response);
            NodeList faults = document.getElementsByTagNameNS(SOAP_NAMESPACE, "Fault");
            if (faults.getLength() > 0) {
                String code = text(document, "faultcode");
                String description = text(document, "faultstring");
                throw new SunatSoapException(code, description == null ? "SUNAT devolvió un SOAP Fault" : description);
            }
            String encoded = text(document, "applicationResponse");
            if (encoded == null || encoded.isBlank()) {
                throw new IllegalStateException("La respuesta SOAP no contiene applicationResponse");
            }
            return Base64.getMimeDecoder().decode(encoded.trim());
        } catch (SunatSoapException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "SUNAT devolvió una respuesta que no pudo interpretarse con seguridad; no reenvíe la factura",
                    e);
        }
    }

    private String call(String endpoint, String soapAction, String payload) {
        String response = restClient.post()
                .uri(endpoint)
                .header("Content-Type", "text/xml; charset=utf-8")
                .header("SOAPAction", "\"" + soapAction + "\"")
                .body(payload)
                .retrieve()
                .body(String.class);
        if (response == null || response.isBlank()) {
            throw new IllegalStateException("SUNAT devolvió una respuesta vacía");
        }
        return response;
    }

    private Document parse(String response) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory.newDocumentBuilder().parse(
                new ByteArrayInputStream(response.getBytes(StandardCharsets.UTF_8)));
    }

    private String text(Document document, String localName) {
        NodeList nodes = document.getElementsByTagNameNS("*", localName);
        if (nodes.getLength() == 0) {
            nodes = document.getElementsByTagName(localName);
        }
        return nodes.getLength() == 0 ? null : nodes.item(0).getTextContent();
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    public static class SunatSoapException extends Exception {
        private final String code;

        public SunatSoapException(String code, String message) {
            super(message);
            this.code = code;
        }

        public String getCode() { return code; }
    }

    public record StatusResult(String statusCode, String statusMessage, byte[] cdr) {}
}
