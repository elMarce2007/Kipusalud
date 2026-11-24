package com.kipusalud.personalservice.controller;

import com.kipusalud.personalservice.entity.Personal;
import com.kipusalud.personalservice.repository.PersonalRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/personal/reporte")
public class ReporteController {

    private static final String CARPETA = "reportes";

    private final PersonalRepository personalRepository;

    public ReporteController(PersonalRepository personalRepository) {
        this.personalRepository = personalRepository;
    }

    @GetMapping("/csv")
    public ResponseEntity<byte[]> generarReporteCsv() throws IOException {

        Long farmaciaId = TenantContext.requireFarmaciaId();
        List<Personal> lista = personalRepository.findAllByFarmaciaIdOrderByApellidosAscNombresAsc(farmaciaId);

        String marca = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String nombreArchivo = "personal_" + farmaciaId + "_" + marca + ".csv";
        Path ruta = Paths.get(CARPETA, nombreArchivo);

        Files.createDirectories(ruta.getParent());

        try (BufferedWriter bw = Files.newBufferedWriter(ruta, StandardCharsets.UTF_8)) {
            bw.write("id,nombres,apellidos,cargo,email,dni,colegiatura,telefono,turno,estado");
            bw.newLine();

            for (Personal p : lista) {
                bw.write(String.join(",", String.valueOf(p.getId()), celda(p.getNombres()), celda(p.getApellidos()),
                        celda(p.getCargo()), celda(p.getEmail()), celda(p.getDni()), celda(p.getColegiatura()),
                        celda(p.getTelefono()), celda(p.getTurno()), p.isActivo() ? "ACTIVO" : "INACTIVO"));
                bw.newLine();
            }
        }

        byte[] contenido = Files.readAllBytes(ruta);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + nombreArchivo)
                .body(contenido);
    }

    @GetMapping("/listar")
    public ResponseEntity<List<String>> listarReportes() throws IOException {

        Path carpeta = Paths.get(CARPETA);

        if (!Files.exists(carpeta)) {
            return ResponseEntity.ok(List.of());
        }

        try (var stream = Files.list(carpeta)) {
            String prefijo = "personal_" + TenantContext.requireFarmaciaId() + "_";
            List<String> nombres = stream
                    .map(p -> p.getFileName().toString())
                    .filter(name -> name.startsWith(prefijo) && name.endsWith(".csv"))
                    .sorted()
                    .collect(Collectors.toList());
            return ResponseEntity.ok(nombres);
        }
    }

    @GetMapping("/leer/{nombreArchivo}")
    public ResponseEntity<String> leerReporte(@PathVariable String nombreArchivo) throws IOException {

        Long farmaciaId = TenantContext.requireFarmaciaId();
        Path carpeta = Paths.get(CARPETA).toAbsolutePath().normalize();
        Path ruta = carpeta.resolve(nombreArchivo).normalize();
        String prefijo = "personal_" + farmaciaId + "_";

        if (!ruta.startsWith(carpeta)
                || !ruta.getFileName().toString().equals(nombreArchivo)
                || !nombreArchivo.startsWith(prefijo)
                || !nombreArchivo.endsWith(".csv")
                || !Files.isRegularFile(ruta)) {
            return ResponseEntity.notFound().build();
        }

        List<String> lineas = Files.readAllLines(ruta, StandardCharsets.UTF_8);
        String contenido = String.join("\n", lineas);
        return ResponseEntity.ok(contenido);
    }

    /** Celda CSV: vacía si no hay dato, entre comillas si contiene comas o comillas. */
    private static String celda(String valor) {
        if (valor == null) return "";
        String texto = valor.startsWith("=") || valor.startsWith("+") || valor.startsWith("-") || valor.startsWith("@")
                ? "'" + valor : valor;
        return texto.contains(",") || texto.contains("\"") || texto.contains("\n")
                ? "\"" + texto.replace("\"", "\"\"") + "\"" : texto;
    }
}
