package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.entity.ComprobanteElectronico;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.entity.Venta;
import com.kipusalud.ventasservice.repository.ComprobanteElectronicoRepository;
import com.kipusalud.ventasservice.repository.SunatConfiguracionRepository;
import com.kipusalud.ventasservice.repository.VentaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class FacturaPersistenceService {

    private final VentaRepository ventaRepository;
    private final SunatConfiguracionRepository configuracionRepository;
    private final ComprobanteElectronicoRepository comprobanteRepository;
    private final SunatConfiguracionService configuracionService;
    private final SunatFacturaXmlGenerator xmlGenerator;

    public FacturaPersistenceService(
            VentaRepository ventaRepository,
            SunatConfiguracionRepository configuracionRepository,
            ComprobanteElectronicoRepository comprobanteRepository,
            SunatConfiguracionService configuracionService,
            SunatFacturaXmlGenerator xmlGenerator
    ) {
        this.ventaRepository = ventaRepository;
        this.configuracionRepository = configuracionRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.configuracionService = configuracionService;
        this.xmlGenerator = xmlGenerator;
    }

    @Transactional
    public PreparedInvoice preparar(Long ventaId, ClienteClient.ClienteDto cliente) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        Venta venta = ventaRepository.findByIdAndFarmaciaId(ventaId, farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada"));
        if (!"CONFIRMADA".equals(venta.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Solo se puede emitir una factura para una venta confirmada");
        }
        SunatConfiguracion config = configuracionRepository.findForUpdate(farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                        "Configure los datos fiscales y las credenciales de SUNAT para esta farmacia"));
        Optional<ComprobanteElectronico> existing =
                comprobanteRepository.findByFarmaciaIdAndVentaId(farmaciaId, ventaId);
        if (existing.isPresent()) {
            ComprobanteElectronico comprobante = existing.get();
            if (!"PREPARADA".equals(comprobante.getEstado())) {
                return new PreparedInvoice(comprobante, config.getRuc(), null, null);
            }
            SunatConfiguracionService.Credentials credentials =
                    configuracionService.decryptCredentials(config);
            return new PreparedInvoice(comprobante, config.getRuc(), credentials,
                    zip(comprobante.getNombreArchivo(), comprobante.getXmlFirmado()));
        }

        long nextNumber = config.getSiguienteNumero() == null ? 1 : config.getSiguienteNumero();
        if (nextNumber > 99_999_999L) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La serie de facturación agotó su correlativo de ocho dígitos");
        }
        String number = "%08d".formatted(nextNumber);
        String fileName = config.getRuc() + "-01-" + config.getSerieFactura() + "-" + number;
        SunatConfiguracionService.Credentials credentials = configuracionService.decryptCredentials(config);

        ComprobanteElectronico comprobante = new ComprobanteElectronico();
        comprobante.setFarmaciaId(farmaciaId);
        comprobante.setVentaId(ventaId);
        comprobante.setSerie(config.getSerieFactura());
        comprobante.setNumero(number);
        comprobante.setNombreArchivo(fileName + ".zip");
        comprobante.setEstado("PREPARADA");
        comprobante.setFechaCreacion(LocalDateTime.now());
        comprobante.setXmlFirmado(xmlGenerator.generateAndSign(venta, config, credentials, comprobante, cliente));
        comprobante = comprobanteRepository.saveAndFlush(comprobante);
        config.setSiguienteNumero(nextNumber + 1);
        configuracionRepository.save(config);
        return new PreparedInvoice(comprobante, config.getRuc(), credentials,
                zip(comprobante.getNombreArchivo(), comprobante.getXmlFirmado()));
    }

    @Transactional
    public ComprobanteElectronico marcarEnviando(Long comprobanteId) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (comprobanteRepository.marcarEnviandoSiPreparada(comprobanteId, farmaciaId) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El comprobante ya tiene un intento de envío; no se reenviará automáticamente");
        }
        return comprobanteRepository.findById(comprobanteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comprobante no encontrado"));
    }

    @Transactional
    public ComprobanteElectronico guardarResultado(
            Long comprobanteId, String estado, byte[] cdr, String codigo, String descripcion
    ) {
        ComprobanteElectronico comprobante = findByIdAndTenant(comprobanteId);
        comprobante.setEstado(estado);
        comprobante.setCdrZip(cdr);
        comprobante.setCodigoRespuesta(codigo);
        comprobante.setDescripcionRespuesta(limitar(descripcion));
        comprobante.setFechaRespuesta(LocalDateTime.now());
        return comprobanteRepository.save(comprobante);
    }

    @Transactional(readOnly = true)
    public ComprobanteElectronico obtener(Long ventaId) {
        return comprobanteRepository.findByFarmaciaIdAndVentaId(TenantContext.requireFarmaciaId(), ventaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "La venta no tiene un comprobante electrónico registrado"));
    }

    @Transactional(readOnly = true)
    public byte[] obtenerCdr(Long ventaId) {
        ComprobanteElectronico comprobante = obtener(ventaId);
        if (comprobante.getCdrZip() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El comprobante aún no tiene un CDR descargable");
        }
        return comprobante.getCdrZip().clone();
    }

    @Transactional(readOnly = true)
    public Long obtenerVentaClienteId(Long ventaId) {
        return ventaRepository.findByIdAndFarmaciaId(ventaId, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada"))
                .getClienteId();
    }

    @Transactional(readOnly = true)
    public SunatConfiguracion configuracionParaConsulta(Long farmaciaId) {
        return configuracionRepository.findById(farmaciaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                        "No existe una configuración de SUNAT para consultar el comprobante"));
    }

    public SunatConfiguracionService.Credentials descifrarCredenciales(SunatConfiguracion config) {
        return configuracionService.decryptCredentials(config);
    }

    private ComprobanteElectronico findByIdAndTenant(Long id) {
        ComprobanteElectronico comprobante = comprobanteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comprobante no encontrado"));
        if (!TenantContext.requireFarmaciaId().equals(comprobante.getFarmaciaId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comprobante no encontrado");
        }
        return comprobante;
    }

    private byte[] zip(String fileName, String xml) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            zip.putNextEntry(new ZipEntry(fileName.replaceFirst("\\.zip$", ".xml")));
            zip.write(xml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.finish();
            return bytes.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo empaquetar la factura para enviarla a SUNAT", e);
        }
    }

    private String limitar(String value) {
        if (value == null) return null;
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }

    public record PreparedInvoice(
            ComprobanteElectronico comprobante,
            String ruc,
            SunatConfiguracionService.Credentials credentials,
            byte[] zip
    ) {}
}
