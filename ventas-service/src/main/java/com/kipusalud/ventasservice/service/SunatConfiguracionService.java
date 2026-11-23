package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.dto.CredencialesSunatRequest;
import com.kipusalud.ventasservice.dto.OpcionesComprobanteDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionRequest;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.repository.ComprobanteElectronicoRepository;
import com.kipusalud.ventasservice.repository.SunatConfiguracionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Enumeration;

/**
 * Perfil fiscal de la farmacia (datos del emisor y series) y credenciales SUNAT. Ambos se
 * guardan por separado para poder corregir datos del emisor sin volver a enviar secretos.
 */
@Service
public class SunatConfiguracionService {

    /** Desde este importe SUNAT exige identificar al adquiriente de una boleta. */
    public static final BigDecimal MONTO_MINIMO_BOLETA_CON_DOCUMENTO = new BigDecimal("700.00");

    private final SunatConfiguracionRepository repository;
    private final ComprobanteElectronicoRepository comprobanteRepository;
    private final SunatSecretCrypto crypto;

    public SunatConfiguracionService(
            SunatConfiguracionRepository repository,
            ComprobanteElectronicoRepository comprobanteRepository,
            SunatSecretCrypto crypto
    ) {
        this.repository = repository;
        this.comprobanteRepository = comprobanteRepository;
        this.crypto = crypto;
    }

    public SunatConfiguracionDto obtener() {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        return repository.findById(farmaciaId).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Los datos fiscales de la farmacia aún no están registrados"));
    }

    @Transactional
    public SunatConfiguracionDto guardarPerfil(SunatConfiguracionRequest request) {
        validarPerfil(request);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        SunatConfiguracion config = repository.findForUpdate(farmaciaId).orElseGet(() -> {
            SunatConfiguracion nueva = new SunatConfiguracion();
            nueva.setFarmaciaId(farmaciaId);
            return nueva;
        });

        String serieFactura = request.serieFactura().trim().toUpperCase();
        if (!serieFactura.equals(config.getSerieFactura())) {
            config.setSiguienteNumero(siguienteLibre(farmaciaId, "01", serieFactura));
        }
        String serieBoleta = request.serieBoleta().trim().toUpperCase();
        if (!serieBoleta.equals(config.getSerieBoleta())) {
            config.setSiguienteNumeroBoleta(siguienteLibre(farmaciaId, "03", serieBoleta));
        }

        config.setRuc(request.ruc().trim());
        config.setRazonSocial(request.razonSocial().trim());
        config.setDireccionFiscal(request.direccionFiscal().trim());
        config.setUbigeo(request.ubigeo().trim());
        config.setDepartamento(request.departamento().trim());
        config.setProvincia(request.provincia().trim());
        config.setDistrito(request.distrito().trim());
        config.setSerieFactura(serieFactura);
        config.setSerieBoleta(serieBoleta);
        config.setTelefono(opcional(request.telefono()));
        config.setEmail(opcional(request.email()));
        return toDto(repository.save(config));
    }

    @Transactional
    public SunatConfiguracionDto guardarCredenciales(CredencialesSunatRequest request) {
        if (request == null || blank(request.usuarioSol()) || blank(request.claveSol())
                || blank(request.certificadoPkcs12Base64()) || request.claveCertificado() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El usuario SOL, su clave, el certificado digital y su contraseña son obligatorios");
        }
        Long farmaciaId = TenantContext.requireFarmaciaId();
        SunatConfiguracion config = repository.findForUpdate(farmaciaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                        "Registra primero los datos fiscales de la farmacia"));
        byte[] certificado;
        try {
            certificado = Base64.getDecoder().decode(request.certificadoPkcs12Base64());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El certificado debe enviarse codificado en Base64");
        }
        if (certificado.length > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El certificado excede el tamaño permitido");
        }
        validarCertificado(certificado, request.claveCertificado());

        config.setSolUsuarioCifrado(crypto.encrypt(request.usuarioSol().trim().getBytes(StandardCharsets.UTF_8)));
        config.setSolClaveCifrada(crypto.encrypt(request.claveSol().getBytes(StandardCharsets.UTF_8)));
        config.setCertificadoCifrado(crypto.encrypt(certificado));
        config.setCertificadoClaveCifrada(crypto.encrypt(request.claveCertificado().getBytes(StandardCharsets.UTF_8)));
        return toDto(repository.save(config));
    }

    /** Disponibilidad de comprobantes para el punto de venta de la farmacia actual. */
    @Transactional(readOnly = true)
    public OpcionesComprobanteDto opciones() {
        SunatConfiguracion config = repository.findById(TenantContext.requireFarmaciaId()).orElse(null);
        if (config == null) {
            return new OpcionesComprobanteDto(false, false,
                    "El administrador aún no registró los datos fiscales de la farmacia.",
                    MONTO_MINIMO_BOLETA_CON_DOCUMENTO, null);
        }
        OpcionesComprobanteDto.Emisor emisor = new OpcionesComprobanteDto.Emisor(config.getRuc(),
                config.getRazonSocial(), config.getDireccionFiscal(), config.getTelefono(), config.getEmail());
        if (!config.tieneCredenciales()) {
            return new OpcionesComprobanteDto(false, false,
                    "El administrador aún no registró las credenciales SUNAT de la farmacia.",
                    MONTO_MINIMO_BOLETA_CON_DOCUMENTO, emisor);
        }
        boolean boleta = !blank(config.getSerieBoleta());
        boolean factura = !blank(config.getSerieFactura());
        return new OpcionesComprobanteDto(boleta, factura,
                boleta ? null : "Falta configurar la serie de boletas electrónicas.",
                MONTO_MINIMO_BOLETA_CON_DOCUMENTO, emisor);
    }

    /**
     * Comprueba, antes de tocar el inventario, que la farmacia puede emitir ese tipo de
     * comprobante electrónico ("01" factura, "03" boleta).
     */
    @Transactional(readOnly = true)
    public void validarEmisionDisponible(Long farmaciaId, String tipoSunat) {
        SunatConfiguracion config = repository.findById(farmaciaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                        "Configure los datos fiscales y las credenciales de SUNAT para esta farmacia"));
        if (!config.tieneCredenciales() || blank(serie(config, tipoSunat))) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                    "La farmacia no tiene habilitada la emisión electrónica de este comprobante");
        }
    }

    public static String serie(SunatConfiguracion config, String tipoSunat) {
        return "03".equals(tipoSunat) ? config.getSerieBoleta() : config.getSerieFactura();
    }

    public Credentials decryptCredentials(SunatConfiguracion config) {
        if (!config.tieneCredenciales()) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                    "Registre las credenciales SUNAT de la farmacia");
        }
        return new Credentials(
                new String(crypto.decrypt(config.getSolUsuarioCifrado()), StandardCharsets.UTF_8),
                new String(crypto.decrypt(config.getSolClaveCifrada()), StandardCharsets.UTF_8),
                crypto.decrypt(config.getCertificadoCifrado()),
                new String(crypto.decrypt(config.getCertificadoClaveCifrada()), StandardCharsets.UTF_8)
        );
    }

    /** Al cambiar de serie se continúa después del último número ya emitido en ella. */
    private long siguienteLibre(Long farmaciaId, String tipo, String serie) {
        return comprobanteRepository.ultimoNumero(farmaciaId, tipo, serie)
                .map(numero -> Long.parseLong(numero) + 1)
                .orElse(1L);
    }

    private void validarPerfil(SunatConfiguracionRequest request) {
        if (request == null || blank(request.ruc()) || !request.ruc().trim().matches("\\d{11}")
                || blank(request.razonSocial()) || blank(request.direccionFiscal())
                || blank(request.ubigeo()) || !request.ubigeo().trim().matches("\\d{6}")
                || blank(request.departamento()) || blank(request.provincia()) || blank(request.distrito())
                || request.serieFactura() == null || !request.serieFactura().trim().matches("(?i)F[A-Z0-9]{3}")
                || request.serieBoleta() == null || !request.serieBoleta().trim().matches("(?i)B[A-Z0-9]{3}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Los datos del emisor, la serie de facturas F### y la serie de boletas B### son obligatorios");
        }
        if (largo(request.razonSocial(), 150) || largo(request.direccionFiscal(), 255)
                || largo(request.departamento(), 100) || largo(request.provincia(), 100)
                || largo(request.distrito(), 100) || largo(request.telefono(), 30) || largo(request.email(), 120)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algún dato fiscal excede la longitud permitida");
        }
    }

    private void validarCertificado(byte[] certificado, String password) {
        try {
            java.security.KeyStore keyStore = java.security.KeyStore.getInstance("PKCS12");
            keyStore.load(new ByteArrayInputStream(certificado), password.toCharArray());
            Enumeration<String> aliases = keyStore.aliases();
            while (aliases.hasMoreElements()) {
                if (keyStore.isKeyEntry(aliases.nextElement())) {
                    return;
                }
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El PKCS#12 debe contener una clave privada");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo abrir el certificado PKCS#12 con la clave proporcionada");
        }
    }

    private SunatConfiguracionDto toDto(SunatConfiguracion c) {
        return new SunatConfiguracionDto(c.getRuc(), c.getRazonSocial(), c.getDireccionFiscal(), c.getUbigeo(),
                c.getDepartamento(), c.getProvincia(), c.getDistrito(), c.getSerieFactura(), c.getSerieBoleta(),
                c.getTelefono(), c.getEmail(), c.tieneCredenciales());
    }

    private String opcional(String value) {
        return blank(value) ? null : value.trim();
    }

    private boolean largo(String value, int max) {
        return value != null && value.trim().length() > max;
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record Credentials(String usuarioSol, String claveSol, byte[] certificado, String claveCertificado) {}
}
