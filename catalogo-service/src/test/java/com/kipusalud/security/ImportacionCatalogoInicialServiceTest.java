package com.kipusalud.security;

import com.kipusalud.catalogoservice.repository.CatalogoImportacionInicialRepository;
import com.kipusalud.catalogoservice.repository.CategoriaRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.catalogoservice.service.ImportacionCatalogoInicialService;
import com.kipusalud.catalogoservice.service.InventarioService;
import com.kipusalud.catalogoservice.service.ProductoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ImportacionCatalogoInicialServiceTest {

    private CategoriaRepository categoriaRepository;
    private ProductoRepository productoRepository;
    private CatalogoImportacionInicialRepository importacionRepository;
    private ProductoService productoService;
    private InventarioService inventarioService;
    private ImportacionCatalogoInicialService service;

    @BeforeEach
    void setUp() {
        TenantContext.set(new TenantContext.Identity(
                "admin", 12L, "ADMINISTRADOR", Set.of(RolePermissions.DASHBOARD_VIEW)));
        categoriaRepository = mock(CategoriaRepository.class);
        productoRepository = mock(ProductoRepository.class);
        importacionRepository = mock(CatalogoImportacionInicialRepository.class);
        productoService = mock(ProductoService.class);
        inventarioService = mock(InventarioService.class);
        service = new ImportacionCatalogoInicialService(
                categoriaRepository, productoRepository, importacionRepository,
                productoService, inventarioService);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void rejectsWholeFileBeforeWritingAnyRowWhenOneRowIsInvalid() {
        String csv = """
                nombre,descripcion,categoria,precio,stockMinimo,codigoLote,fechaVencimiento,cantidad
                Paracetamol,Analgesico,Medicamentos,8.50,5,LOT-001,%s,20
                Ibuprofeno,Antiinflamatorio,Medicamentos,no-es-precio,5,LOT-002,%s,10
                """.formatted(LocalDate.now().plusDays(100), LocalDate.now().plusDays(120));
        MockMultipartFile file = new MockMultipartFile(
                "archivo", "catalogo.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class, () -> service.importar(file));

        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(categoriaRepository, productoRepository, importacionRepository,
                productoService, inventarioService);
    }

    @Test
    void rejectsHeadersThatBecomeDuplicatesAfterNormalization() {
        String csv = """
                nombre,descripcion,categoria,precio,pre-cio,stockMinimo,codigoLote,fechaVencimiento,cantidad
                Paracetamol,Analgesico,Medicamentos,8.50,8.50,5,LOT-001,%s,20
                """.formatted(LocalDate.now().plusDays(100));
        MockMultipartFile file = new MockMultipartFile(
                "archivo", "catalogo.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class, () -> service.importar(file));

        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(categoriaRepository, productoRepository, importacionRepository,
                productoService, inventarioService);
    }
}
