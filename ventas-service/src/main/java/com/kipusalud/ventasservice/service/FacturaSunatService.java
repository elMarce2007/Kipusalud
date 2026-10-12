package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.dto.ComprobanteElectronicoDto;
import com.kipusalud.ventasservice.entity.ComprobanteElectronico;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class FacturaSunatService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FacturaSunatService.class);
    private final ClienteClient clienteClient;
    private final FacturaPersistenceService persistence;
    private final SunatSoapClient soapClient;

    public FacturaSunatService(
            ClienteClient clienteClient,
            FacturaPersistenceService persistence,
            SunatSoapClient soapClient
    ) {
        this.clienteClient = clienteClient;
        this.persistence = persistence;
        this.soapClient = soapClient;
    }

    public ComprobanteElectronicoDto emitir(Long ventaId) {
        ClienteClient.ClienteDto cliente = clienteClient.obtenerCliente(
                ventaClienteId(ventaId));
        FacturaPersistenceService.PreparedInvoice prepared = persistence.preparar(ventaId, cliente);
        ComprobanteElectronico existing = prepared.comprobante();
        if (!"PREPARADA".equals(existing.getEstado())) {
            if ("ACEPTADA".equals(existing.getEstado()) || "RECHAZADA".equals(existing.getEstado())) {
                return toDto(existing);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El resultado del envío sigue sin confirmarse. Consulte el estado antes de tomar otra acción; no se reenviará para evitar una factura duplicada.");
        }

        ComprobanteElectronico sending = persistence.marcarEnviando(existing.getId());
        try {
            byte[] cdr = soapClient.sendBill(prepared.ruc(), prepared.credentials().usuarioSol(),
                    prepared.credentials().claveSol(), sending.getNombreArchivo(), prepared.zip());
            CdrResult result = parseCdr(cdr);
            String status = "0".equals(result.code()) ? "ACEPTADA" : "RECHAZADA";
            return toDto(persistence.guardarResultado(sending.getId(), status, cdr,
                    result.code(), result.description()));
        } catch (SunatSoapClient.SunatSoapException e) {
            return toDto(persistence.guardarResultado(sending.getId(), "RECHAZADA", null,
                    e.getCode(), e.getMessage()));
        } catch (Exception e) {
            LOGGER.error("No se pudo confirmar el resultado de SUNAT para comprobante {}", sending.getId(), e);
            return toDto(persistence.guardarResultado(sending.getId(), "RESULTADO_DESCONOCIDO", null,
                    null, "SUNAT no confirmó el resultado. No vuelva a emitir hasta verificar el comprobante."));
        }
    }

    public ComprobanteElectronicoDto obtener(Long ventaId) {
        return toDto(persistence.obtener(ventaId));
    }

    public byte[] obtenerCdr(Long ventaId) {
        return persistence.obtenerCdr(ventaId);
    }

    public ComprobanteElectronicoDto consultarEnSunat(Long ventaId) {
        ComprobanteElectronico comprobante = persistence.obtener(ventaId);
        if (!"ENVIANDO".equals(comprobante.getEstado())
                && !"RESULTADO_DESCONOCIDO".equals(comprobante.getEstado())) {
            return toDto(comprobante);
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        var config = persistence.configuracionParaConsulta(farmaciaId);
        var credentials = persistence.descifrarCredenciales(config);
        try {
            SunatSoapClient.StatusResult status = soapClient.getStatusAR(config.getRuc(),
                    credentials.usuarioSol(), credentials.claveSol(), comprobante.getTipoComprobante(),
                    comprobante.getSerie(), comprobante.getNumero());
            if ("0".equals(status.statusCode()) && status.cdr() != null) {
                CdrResult result = parseCdr(status.cdr());
                String finalStatus = "0".equals(result.code()) ? "ACEPTADA" : "RECHAZADA";
                return toDto(persistence.guardarResultado(comprobante.getId(), finalStatus, status.cdr(),
                        result.code(), result.description()));
            }
            return toDto(persistence.guardarResultado(comprobante.getId(), "RESULTADO_DESCONOCIDO", null,
                    status.statusCode(), status.statusMessage() == null || status.statusMessage().isBlank()
                            ? "SUNAT aún no devolvió un CDR definitivo" : status.statusMessage()));
        } catch (SunatSoapClient.SunatSoapException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "SUNAT rechazó la consulta de estado: " + e.getMessage());
        } catch (Exception e) {
            LOGGER.error("No se pudo consultar el estado SUNAT del comprobante {}", comprobante.getId(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo consultar el estado del comprobante en SUNAT; el comprobante permanece sin confirmar");
        }
    }

    private Long ventaClienteId(Long ventaId) {
        return persistence.obtenerVentaClienteId(ventaId);
    }

    private CdrResult parseCdr(byte[] cdrZip) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(cdrZip), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory() || !entry.getName().toLowerCase().endsWith(".xml")) continue;
                byte[] data = zip.readAllBytes();
                if (data.length > 2_000_000) {
                    throw new IllegalStateException("El XML de respuesta de SUNAT excede el tamaño permitido");
                }
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                factory.setNamespaceAware(true);
                factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
                factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
                factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
                var document = factory.newDocumentBuilder().parse(new InputSource(
                        new StringReader(new String(data, StandardCharsets.UTF_8))));
                String code = firstText(document, "ResponseCode");
                String description = firstText(document, "Description");
                if (code == null || code.isBlank()) {
                    throw new IllegalStateException("El CDR de SUNAT no contiene ResponseCode");
                }
                return new CdrResult(code.trim(), description == null ? "" : description.trim());
            }
            throw new IllegalStateException("SUNAT no devolvió un XML CDR dentro del archivo de respuesta");
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo validar el CDR recibido desde SUNAT", e);
        }
    }

    private String firstText(org.w3c.dom.Document document, String localName) {
        var nodes = document.getElementsByTagNameNS("*", localName);
        return nodes.getLength() == 0 ? null : nodes.item(0).getTextContent();
    }

    private ComprobanteElectronicoDto toDto(ComprobanteElectronico c) {
        return new ComprobanteElectronicoDto(c.getId(), c.getVentaId(), c.getTipoComprobante(), c.getSerie(),
                c.getNumero(), c.getEstado(), c.getCodigoRespuesta(), c.getDescripcionRespuesta(),
                c.getFechaCreacion(), c.getFechaRespuesta());
    }

    private record CdrResult(String code, String description) {}
}
