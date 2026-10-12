package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.dto.SalidaVentaRequest;
import com.kipusalud.ventasservice.dto.SalidaVentaDto;
import com.kipusalud.security.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Component
public class CatalogoClient {

    private final RestClient restClient;

    public CatalogoClient(
            RestClient.Builder builder,
            @Value("${catalogo-service.url:http://localhost:8083}") String catalogoUrl
    ) {
        this.restClient = builder.baseUrl(catalogoUrl).build();
    }

    public ProductoCatalogo obtenerProducto(Long id) {
        try {
            ProductoCatalogo producto = restClient.get()
                    .uri("/api/productos/{id}", id)
                    .header("Authorization", TenantContext.requireAuthorization())
                    .retrieve()
                    .body(ProductoCatalogo.class);
            if (producto == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "El catálogo devolvió una respuesta vacía");
            }
            return producto;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Uno de los productos no está disponible para esta farmacia");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo validar el producto en el catálogo");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El catálogo de productos no está disponible");
        }
    }

    public SalidaVentaDto descontarPorLotes(
            String claveIdempotencia,
            List<SalidaVentaRequest.LineaSalidaVentaRequest> lineas
    ) {
        try {
            SalidaVentaDto salida = restClient.post()
                    .uri("/api/inventario/ventas/salida")
                    .header("Authorization", TenantContext.requireAuthorization())
                    .body(new SalidaVentaRequest(claveIdempotencia, lineas))
                    .retrieve()
                    .body(SalidaVentaDto.class);
            if (salida == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "El inventario devolvió una respuesta vacía");
            }
            return salida;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "No hay existencias verificadas y vigentes suficientes para completar la venta");
            }
            if (e.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(e.getStatusCode(),
                        "El inventario rechazó el descuento de la venta");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo confirmar el descuento en el inventario");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El inventario no está disponible; la venta no se confirmó");
        }
    }

    public record ProductoCatalogo(
            Long id,
            String nombre,
            java.math.BigDecimal precio,
            Integer stock,
            String afectacionIgv,
            Boolean precioIncluyeIgv
    ) {}
}
