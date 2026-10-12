package com.kipusalud.ventasservice.service;

import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class SunatSoapClientTest {

    @Test
    void createsSoap11SendBillEnvelopeWithWsSecurityAndBase64Zip() throws Exception {
        byte[] zip = new byte[]{0, 1, 2, 3, 4};
        String envelope = SunatSoapClient.soapEnvelope("20123456789", "MODULO&01",
                "clave<sol>", "20123456789-01-F001-00000001.zip", zip);
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        Document document = factory.newDocumentBuilder().parse(new ByteArrayInputStream(
                envelope.getBytes(StandardCharsets.UTF_8)));

        assertEquals("20123456789MODULO&01",
                document.getElementsByTagNameNS("*", "Username").item(0).getTextContent());
        assertEquals("clave<sol>",
                document.getElementsByTagNameNS("*", "Password").item(0).getTextContent());
        assertEquals(Base64.getEncoder().encodeToString(zip),
                document.getElementsByTagNameNS("*", "contentFile").item(0).getTextContent());
        assertEquals("sendBill", document.getElementsByTagNameNS("*", "sendBill").item(0).getLocalName());
    }
}
