package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.dto.SunatConfiguracionDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionRequest;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.repository.SunatConfiguracionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Enumeration;
import java.util.Optional;

@Service
public class SunatConfiguracionService {

    private final SunatConfiguracionRepository repository;
    private final SunatSecretCrypto crypto;

    public SunatConfiguracionService(SunatConfiguracionRepository repository, SunatSecretCrypto crypto) {
        this.repository = repository;
        this.crypto = crypto;
    }

    public SunatConfiguracionDto obtener() {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        return repository.findById(farmaciaId).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "La configuración de SUNAT aún no está registrada para esta farmacia"));
    }

    @Transactional
    public SunatConfiguracionDto guardar(SunatConfiguracionRequest request) {
        validar(request);
        Long farmaciaId = TenantContext.requireFarmaciaId();
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

        SunatConfiguracion config = repository.findById(farmaciaId).orElseGet(SunatConfiguracion::new);
        String serie = request.serieFactura().trim().toUpperCase();
        if (config.getSerieFactura() != null && !config.getSerieFactura().equals(serie)) {
            config.setSiguienteNumero(1L);
        }
        if (config.getSiguienteNumero() == null) {
            config.setSiguienteNumero(1L);
        }
        config.setFarmaciaId(farmaciaId);
        config.setRuc(request.ruc().trim());
        config.setRazonSocial(request.razonSocial().trim());
        config.setDireccionFiscal(request.direccionFiscal().trim());
        config.setUbigeo(request.ubigeo().trim());
        config.setDepartamento(request.departamento().trim());
        config.setProvincia(request.provincia().trim());
        config.setDistrito(request.distrito().trim());
        config.setSerieFactura(serie);
        config.setSolUsuarioCifrado(crypto.encrypt(request.usuarioSol().trim().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        config.setSolClaveCifrada(crypto.encrypt(request.claveSol().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        config.setCertificadoCifrado(crypto.encrypt(certificado));
        config.setCertificadoClaveCifrada(crypto.encrypt(
                request.claveCertificado().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        return toDto(repository.save(config));
    }

    @Transactional(readOnly = true)
    public SunatConfiguracion requireForEmission(Long farmaciaId) {
        return repository.findById(farmaciaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                        "Configure los datos fiscales y las credenciales de SUNAT para esta farmacia"));
    }

    public Credentials decryptCredentials(SunatConfiguracion config) {
        return new Credentials(
                new String(crypto.decrypt(config.getSolUsuarioCifrado()), java.nio.charset.StandardCharsets.UTF_8),
                new String(crypto.decrypt(config.getSolClaveCifrada()), java.nio.charset.StandardCharsets.UTF_8),
                crypto.decrypt(config.getCertificadoCifrado()),
                new String(crypto.decrypt(config.getCertificadoClaveCifrada()), java.nio.charset.StandardCharsets.UTF_8)
        );
    }

    private void validar(SunatConfiguracionRequest request) {
        if (request == null || blank(request.ruc()) || !request.ruc().trim().matches("\\d{11}")
                || blank(request.razonSocial()) || blank(request.direccionFiscal())
                || blank(request.ubigeo()) || !request.ubigeo().trim().matches("\\d{6}")
                || blank(request.departamento()) || blank(request.provincia()) || blank(request.distrito())
                || request.serieFactura() == null || !request.serieFactura().trim().matches("(?i)F[A-Z0-9]{3}")
                || blank(request.usuarioSol()) || blank(request.claveSol())
                || blank(request.certificadoPkcs12Base64()) || request.claveCertificado() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Los datos del emisor, serie F###, credenciales SOL y certificado digital son obligatorios");
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
                c.getDepartamento(), c.getProvincia(), c.getDistrito(), c.getSerieFactura(), true);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record Credentials(String usuarioSol, String claveSol, byte[] certificado, String claveCertificado) {}
}
