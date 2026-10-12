package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ClienteClient {

    private final RestClient restClient;

    public ClienteClient(
            RestClient.Builder builder,
            @Value("${cliente-service.url:http://localhost:8082}") String clienteUrl
    ) {
        this.restClient = builder.baseUrl(clienteUrl).build();
    }

    public void validarCliente(Long id) {
        obtenerCliente(id);
    }

    public ClienteDto obtenerCliente(Long id) {
        try {
            ClienteDto cliente = restClient.get()
                    .uri("/api/clientes/{id}", id)
                    .header("Authorization", TenantContext.requireAuthorization())
                    .retrieve()
                    .body(ClienteDto.class);
            if (cliente == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "El servicio de clientes devolvió una respuesta vacía");
            }
            return cliente;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El cliente no existe en esta farmacia");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo validar el cliente");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de clientes no está disponible");
        }
    }

    public record ClienteDto(
            Long id,
            String nombres,
            String apellidos,
            String dni,
            String telefono,
            String email,
            String ruc,
            String razonSocial,
            String direccionFiscal
    ) {}
}
