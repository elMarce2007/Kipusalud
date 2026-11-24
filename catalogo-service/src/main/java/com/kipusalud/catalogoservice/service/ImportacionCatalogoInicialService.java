package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.dto.CatalogoInicialEstadoDto;
import com.kipusalud.catalogoservice.dto.CatalogoInicialResultadoDto;
import com.kipusalud.catalogoservice.dto.IngresoMercaderiaRequest;
import com.kipusalud.catalogoservice.dto.ProductoDto;
import com.kipusalud.catalogoservice.entity.CatalogoImportacionInicial;
import com.kipusalud.catalogoservice.entity.Categoria;
import com.kipusalud.catalogoservice.repository.CatalogoImportacionInicialRepository;
import com.kipusalud.catalogoservice.repository.CategoriaRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.security.TenantContext;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ImportacionCatalogoInicialService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_ROWS = 500;
    private static final int MAX_ERRORS = 50;
    private static final Set<String> REQUIRED_HEADERS = Set.of(
            "nombre", "categoria", "precio", "stockminimo",
            "codigolote", "fechavencimiento", "cantidad"
    );

    private final CategoriaRepository categoriaRepository;
    private final ProductoRepository productoRepository;
    private final CatalogoImportacionInicialRepository importacionRepository;
    private final ProductoService productoService;
    private final InventarioService inventarioService;

    public ImportacionCatalogoInicialService(
            CategoriaRepository categoriaRepository,
            ProductoRepository productoRepository,
            CatalogoImportacionInicialRepository importacionRepository,
            ProductoService productoService,
            InventarioService inventarioService
    ) {
        this.categoriaRepository = categoriaRepository;
        this.productoRepository = productoRepository;
        this.importacionRepository = importacionRepository;
        this.productoService = productoService;
        this.inventarioService = inventarioService;
    }

    @Transactional(readOnly = true)
    public CatalogoInicialEstadoDto estado() {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        int existentes = Math.toIntExact(productoRepository.countByFarmaciaId(farmaciaId));
        boolean importado = importacionRepository.existsById(farmaciaId);
        return new CatalogoInicialEstadoDto(!importado && existentes == 0, existentes);
    }

    @Transactional
    public CatalogoInicialResultadoDto importar(MultipartFile archivo) {
        requireAdministrator();
        validarArchivo(archivo);

        List<Map<String, String>> filas = leerFilas(archivo);
        Map<String, ProductoGrupo> productos = validarFilas(filas);
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (productos.isEmpty()) {
            throw badRequest("El archivo no contiene productos para importar");
        }
        if (productoRepository.existsByFarmaciaId(farmaciaId)
                || importacionRepository.existsById(farmaciaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La importación inicial solo está disponible antes de crear productos");
        }

        importacionRepository.saveAndFlush(
                new CatalogoImportacionInicial(farmaciaId, LocalDateTime.now()));

        Map<String, Categoria> categorias = new HashMap<>();
        for (Categoria categoria : categoriaRepository.findAllByFarmaciaIdOrderByNombreAsc(farmaciaId)) {
            categorias.put(clave(categoria.getNombre()), categoria);
        }
        for (ProductoGrupo producto : productos.values()) {
            String categoriaKey = clave(producto.categoria);
            if (!categorias.containsKey(categoriaKey)) {
                Categoria categoria = new Categoria();
                categoria.setNombre(producto.categoria);
                categoria.setFarmaciaId(farmaciaId);
                categorias.put(categoriaKey, categoriaRepository.save(categoria));
            }
        }

        Map<String, Long> productoIds = new HashMap<>();
        for (Map.Entry<String, ProductoGrupo> entry : productos.entrySet()) {
            ProductoGrupo producto = entry.getValue();
            ProductoDto creado = productoService.crear(new ProductoDto(
                    null, producto.nombre, producto.descripcion, producto.precio,
                    0, categorias.get(clave(producto.categoria)).getId(),
                    null, null, producto.stockMinimo, null, null, null, null, null, null));
            productoIds.put(entry.getKey(), creado.id());
        }

        List<IngresoMercaderiaRequest.LineaIngresoRequest> lotes = new ArrayList<>();
        for (Map.Entry<String, ProductoGrupo> entry : productos.entrySet()) {
            Long productoId = productoIds.get(entry.getKey());
            for (FilaImportacion lote : entry.getValue().lotes) {
                lotes.add(new IngresoMercaderiaRequest.LineaIngresoRequest(
                        productoId, lote.codigoLote, lote.fechaVencimiento, lote.cantidad, null));
            }
        }
        inventarioService.registrarIngreso(new IngresoMercaderiaRequest(
                "catalogo-inicial-" + farmaciaId,
                "Importación del catálogo inicial",
                lotes));

        return new CatalogoInicialResultadoDto(
                productos.size(), lotes.size(), "Catálogo inicial importado correctamente");
    }

    private void requireAdministrator() {
        if (!"ADMINISTRADOR".equals(TenantContext.requireRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo el administrador puede importar el catálogo inicial");
        }
    }

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw badRequest("Selecciona un archivo CSV o XLSX");
        }
        if (archivo.getSize() > MAX_FILE_SIZE) {
            throw badRequest("El archivo supera el límite de 5 MB");
        }
        String nombre = archivo.getOriginalFilename();
        if (nombre == null || !(nombre.toLowerCase(Locale.ROOT).endsWith(".csv")
                || nombre.toLowerCase(Locale.ROOT).endsWith(".xlsx"))) {
            throw badRequest("El formato debe ser CSV o XLSX");
        }
    }

    private List<Map<String, String>> leerFilas(MultipartFile archivo) {
        String nombre = archivo.getOriginalFilename().toLowerCase(Locale.ROOT);
        return nombre.endsWith(".csv") ? leerCsv(archivo) : leerXlsx(archivo);
    }

    private List<Map<String, String>> leerCsv(MultipartFile archivo) {
        try (Reader reader = new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .setIgnoreEmptyLines(true)
                     .build()
                     .parse(reader)) {
            Map<String, String> headers = new HashMap<>();
            for (String header : parser.getHeaderNames()) {
                String normalizedHeader = normalizarHeader(header);
                if (headers.putIfAbsent(normalizedHeader, header) != null) {
                    throw badRequest("El archivo contiene encabezados duplicados");
                }
            }
            validarEncabezados(headers.keySet());
            List<Map<String, String>> filas = new ArrayList<>();
            for (CSVRecord record : parser) {
                if (filas.size() == MAX_ROWS) {
                    throw badRequest("El archivo supera el límite de 500 filas");
                }
                Map<String, String> values = new HashMap<>();
                for (String header : headers.keySet()) {
                    values.put(header, record.isSet(headers.get(header)) ? record.get(headers.get(header)) : "");
                }
                filas.add(values);
            }
            return filas;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo leer el archivo CSV", e);
        }
    }

    private List<Map<String, String>> leerXlsx(MultipartFile archivo) {
        try (Workbook workbook = WorkbookFactory.create(archivo.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) {
                throw badRequest("El archivo XLSX no contiene hojas");
            }
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                throw badRequest("El archivo XLSX no contiene encabezados");
            }
            DataFormatter formatter = new DataFormatter(Locale.US);
            Map<String, Integer> headers = new HashMap<>();
            for (int index = 0; index < headerRow.getLastCellNum(); index++) {
                Cell cell = headerRow.getCell(index);
                if (cell != null) {
                    String header = normalizarHeader(formatter.formatCellValue(cell));
                    if (!header.isBlank() && headers.putIfAbsent(header, index) != null) {
                        throw badRequest("El archivo contiene encabezados duplicados");
                    }
                }
            }
            validarEncabezados(headers.keySet());
            List<Map<String, String>> filas = new ArrayList<>();
            for (int rowIndex = headerRow.getRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || filaVacia(row, formatter)) {
                    continue;
                }
                if (filas.size() == MAX_ROWS) {
                    throw badRequest("El archivo supera el límite de 500 filas");
                }
                Map<String, String> values = new HashMap<>();
                for (Map.Entry<String, Integer> header : headers.entrySet()) {
                    Cell cell = row.getCell(header.getValue());
                    if (cell != null && cell.getCellType() == CellType.FORMULA) {
                        throw badRequest("No se permiten fórmulas en la fila " + (rowIndex + 1));
                    }
                    String value = cell == null ? "" : formatter.formatCellValue(cell);
                    if ("fechavencimiento".equals(header.getKey()) && cell != null
                            && DateUtil.isCellDateFormatted(cell)) {
                        value = cell.getLocalDateTimeCellValue().toLocalDate().toString();
                    }
                    values.put(header.getKey(), value);
                }
                filas.add(values);
            }
            return filas;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo leer el archivo XLSX", e);
        } catch (org.apache.poi.EncryptedDocumentException e) {
            throw badRequest("No se admiten archivos XLSX cifrados");
        }
    }

    private boolean filaVacia(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (cell != null && !formatter.formatCellValue(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private void validarEncabezados(Set<String> headers) {
        Set<String> faltantes = new HashSet<>(REQUIRED_HEADERS);
        faltantes.removeAll(headers);
        if (!faltantes.isEmpty()) {
            throw badRequest("Faltan columnas requeridas: " + String.join(", ", faltantes));
        }
    }

    private Map<String, ProductoGrupo> validarFilas(List<Map<String, String>> filas) {
        List<String> errores = new ArrayList<>();
        Map<String, ProductoGrupo> productos = new LinkedHashMap<>();
        for (int index = 0; index < filas.size(); index++) {
            int numeroFila = index + 2;
            try {
                FilaImportacion fila = parsearFila(filas.get(index));
                String key = clave(fila.nombre);
                ProductoGrupo producto = productos.get(key);
                if (producto == null) {
                    producto = new ProductoGrupo(
                            fila.nombre, fila.descripcion, fila.categoria, fila.precio, fila.stockMinimo);
                    productos.put(key, producto);
                } else if (!producto.coincide(fila)) {
                    throw new IllegalArgumentException(
                            "las filas del mismo producto deben repetir categoría, descripción, precio y stock mínimo");
                }
                if (!producto.codigosLote.add(fila.codigoLote.toUpperCase(Locale.ROOT))) {
                    throw new IllegalArgumentException("el código de lote está repetido para este producto");
                }
                producto.lotes.add(fila);
            } catch (IllegalArgumentException e) {
                if (errores.size() < MAX_ERRORS) {
                    errores.add("Fila " + numeroFila + ": " + e.getMessage());
                }
            }
        }
        if (!errores.isEmpty()) {
            throw badRequest("El catálogo no se importó. Corrige estos errores: "
                    + String.join("; ", errores));
        }
        return productos;
    }

    private FilaImportacion parsearFila(Map<String, String> values) {
        String nombre = requerido(values, "nombre", 100);
        String categoria = requerido(values, "categoria", 100);
        String descripcion = values.getOrDefault("descripcion", "").trim();
        if (descripcion.length() > 255) {
            throw new IllegalArgumentException("descripción supera 255 caracteres");
        }
        BigDecimal precio;
        try {
            precio = new BigDecimal(requerido(values, "precio", 30)).setScale(2, RoundingMode.UNNECESSARY);
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException("precio debe ser un número positivo con hasta 2 decimales");
        }
        if (precio.signum() <= 0 || precio.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw new IllegalArgumentException("precio fuera del rango permitido");
        }
        int stockMinimo = entero(values, "stockminimo", 0, 1_000_000);
        String codigoLote = requerido(values, "codigolote", 100).toUpperCase(Locale.ROOT);
        LocalDate vencimiento = fecha(values.getOrDefault("fechavencimiento", "").trim());
        if (vencimiento.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("el vencimiento no puede estar en el pasado");
        }
        int cantidad = entero(values, "cantidad", 1, 1_000_000);
        return new FilaImportacion(nombre, descripcion.isBlank() ? null : descripcion, categoria,
                precio, stockMinimo, codigoLote, vencimiento, cantidad);
    }

    private int entero(Map<String, String> values, String field, int min, int max) {
        try {
            int value = new BigDecimal(requerido(values, field, 20)).intValueExact();
            if (value < min || value > max) {
                throw new IllegalArgumentException(field + " fuera del rango permitido");
            }
            return value;
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException(field + " debe ser un número entero");
        }
    }

    private LocalDate fecha(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("fechaVencimiento debe usar el formato AAAA-MM-DD");
        }
    }

    private String requerido(Map<String, String> values, String field, int maxLength) {
        String value = values.getOrDefault(field, "").trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException(field + " es obligatorio");
        }
        if (value.length() > maxLength) {
            throw new IllegalArgumentException(field + " supera " + maxLength + " caracteres");
        }
        return value;
    }

    private String normalizarHeader(String header) {
        return header.replace("\uFEFF", "").trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private String clave(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record FilaImportacion(
            String nombre,
            String descripcion,
            String categoria,
            BigDecimal precio,
            int stockMinimo,
            String codigoLote,
            LocalDate fechaVencimiento,
            int cantidad
    ) {}

    private static final class ProductoGrupo {
        private final String nombre;
        private final String descripcion;
        private final String categoria;
        private final BigDecimal precio;
        private final int stockMinimo;
        private final List<FilaImportacion> lotes = new ArrayList<>();
        private final Set<String> codigosLote = new HashSet<>();

        private ProductoGrupo(String nombre, String descripcion, String categoria,
                              BigDecimal precio, int stockMinimo) {
            this.nombre = nombre;
            this.descripcion = descripcion;
            this.categoria = categoria;
            this.precio = precio;
            this.stockMinimo = stockMinimo;
        }

        private boolean coincide(FilaImportacion fila) {
            return java.util.Objects.equals(descripcion, fila.descripcion)
                    && categoria.equalsIgnoreCase(fila.categoria)
                    && precio.compareTo(fila.precio) == 0
                    && stockMinimo == fila.stockMinimo;
        }
    }
}
