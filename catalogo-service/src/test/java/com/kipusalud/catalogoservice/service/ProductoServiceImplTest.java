package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.AltaProductoRequest;
import com.kipusalud.catalogoservice.dto.ProductoDto;
import com.kipusalud.catalogoservice.repository.CategoriaRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.catalogoservice.socket.SocketNotificationServer;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ProductoServiceImplTest {

    private final ProductoRepository productoRepository = mock(ProductoRepository.class);
    private final CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
    private final SocketNotificationServer socketNotificationServer = mock(SocketNotificationServer.class);
    private final DomainEventOutbox domainEventOutbox = mock(DomainEventOutbox.class);
    private final InventarioService inventarioService = mock(InventarioService.class);
    private final ProductoServiceImpl service = new ProductoServiceImpl(
            productoRepository, categoriaRepository, socketNotificationServer,
            domainEventOutbox, inventarioService);

    @Test
    void crearNoPermiteStockFueraDelRegistroPorLotes() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crear(producto(12)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(productoRepository, categoriaRepository, inventarioService);
    }

    @Test
    void altaCompletaNoPermiteStockInicialSinDatosDeLote() {
        AltaProductoRequest request = new AltaProductoRequest(producto(12), null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crearConIngreso(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(productoRepository, categoriaRepository, inventarioService);
    }

    private ProductoDto producto(Integer stock) {
        return new ProductoDto(null, "Medicamento de prueba", "", BigDecimal.ONE,
                stock, 1L, null, null, 0);
    }
}
