package com.kipusalud.authservice.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Datos ficticios y coherentes de una farmacia de demostración: catálogo con ficha,
 * lotes con costo y vencimientos variados, un mes de ventas despachadas por FEFO,
 * bajas de inventario, clientes y personal por turnos.
 *
 * Es determinista para una misma semilla y fecha, y no toca la base de datos:
 * {@link DemoTenantDatabase} se encarga de insertarlo.
 */
final class DemoDataset {

    static final int DIAS_DE_HISTORIA = 30;
    static final String SERIE_INTERNA = "I001";

    record Usuarios(String administrador, String gerente, String quimico, String cajero) {}

    record Categoria(String nombre, String descripcion, String codigoAtc, String condicionVenta) {}

    record Producto(int categoria, String nombre, String principioActivo, String laboratorio, String presentacion,
                    String registroSanitario, String codigoBarras, String ubicacion, BigDecimal precio) {}

    record Ingreso(String referencia, LocalDateTime fecha, String actor) {}

    static final class Lote {
        final int producto;
        final int ingreso;
        final String codigo;
        final LocalDate vence;
        final int inicial;
        final BigDecimal costo;
        final LocalDateTime creado;
        int disponible;

        Lote(int producto, int ingreso, String codigo, LocalDate vence, int inicial, BigDecimal costo,
             LocalDateTime creado) {
            this.producto = producto;
            this.ingreso = ingreso;
            this.codigo = codigo;
            this.vence = vence;
            this.inicial = inicial;
            this.costo = costo;
            this.creado = creado;
            this.disponible = inicial;
        }
    }

    record Asignacion(int lote, int cantidad) {}

    record Linea(int producto, int cantidad, BigDecimal precio, BigDecimal subtotal, List<Asignacion> lotes) {}

    record Venta(int numero, LocalDateTime fecha, Integer cliente, String vendedor, String metodoPago,
                 BigDecimal total, BigDecimal recibido, BigDecimal vuelto, List<Linea> lineas) {}

    record Ajuste(int lote, int cantidad, String motivo, String observacion, LocalDateTime fecha, String actor) {}

    record Cliente(String nombres, String apellidos, String dni, String telefono, String email,
                   String ruc, String razonSocial, String direccionFiscal) {}

    record Colaborador(String nombres, String apellidos, String cargo, String email, String dni,
                       String colegiatura, String telefono, String turno) {}

    final List<Categoria> categorias = new ArrayList<>();
    final List<Producto> productos = new ArrayList<>();
    final List<Ingreso> ingresos = new ArrayList<>();
    final List<Lote> lotes = new ArrayList<>();
    final List<Venta> ventas = new ArrayList<>();
    final List<Ajuste> ajustes = new ArrayList<>();
    final List<Cliente> clientes = new ArrayList<>();
    final List<Colaborador> personal = new ArrayList<>();
    /** Stock mínimo sugerido por producto: una semana de demanda, al menos 5. */
    final List<Integer> stockMinimo = new ArrayList<>();

    private final Random random;
    private final LocalDateTime ahora;
    private final Usuarios usuarios;
    private final Set<String> documentos = new HashSet<>();
    /** Peso de demanda por producto (ventas relativas). */
    private final List<Integer> demanda = new ArrayList<>();

    private DemoDataset(long semilla, LocalDateTime ahora, Usuarios usuarios) {
        this.random = new Random(semilla);
        this.ahora = ahora;
        this.usuarios = usuarios;
    }

    static DemoDataset generar(long semilla, LocalDateTime ahora, Usuarios usuarios) {
        DemoDataset d = new DemoDataset(semilla, ahora, usuarios);
        d.crearCatalogo();
        d.crearClientes();
        d.crearPersonal();
        d.simularMovimientos();
        return d;
    }

    int stockDe(int producto) {
        return lotes.stream().filter(l -> l.producto == producto).mapToInt(l -> l.disponible).sum();
    }

    // ---------------------------------------------------------------- catálogo

    private void crearCatalogo() {
        categorias.add(new Categoria("Analgésicos y antipiréticos", "Alivio del dolor y la fiebre", "N02BE", "VENTA_LIBRE"));
        categorias.add(new Categoria("Antiinflamatorios (AINE)", "Dolor e inflamación", "M01AE", "VENTA_LIBRE"));
        categorias.add(new Categoria("Antibióticos", "Antibacterianos de uso sistémico", "J01CA", "RECETA_RETENIDA"));
        categorias.add(new Categoria("Antihipertensivos", "Tratamiento de la presión arterial", "C09AA", "RECETA"));
        categorias.add(new Categoria("Antidiabéticos", "Control de la glucosa", "A10BA", "RECETA"));
        categorias.add(new Categoria("Antialérgicos", "Antihistamínicos", "R06AE", "VENTA_LIBRE"));
        categorias.add(new Categoria("Gastrointestinales", "Acidez, diarrea y rehidratación", "A02BC", "VENTA_LIBRE"));
        categorias.add(new Categoria("Vitaminas y suplementos", "Vitaminas y minerales", "A11GA", "VENTA_LIBRE"));
        categorias.add(new Categoria("Respiratorio", "Tos y expectorantes", "R05CB", "VENTA_LIBRE"));

        // categoría, nombre, principio activo, laboratorio, presentación, precio, costo, demanda, lotes
        producto(0, "Paracetamol 500 mg", "Paracetamol", "Laboratorios Andinos", "Blíster x 10 tab", "2.50", "1.10", 10,
                lote(0, 70, 420), lote(1, 60, 540));
        producto(0, "Paracetamol 120 mg/5 mL jarabe", "Paracetamol", "Farma Inca", "Frasco x 60 mL", "6.50", "3.20", 4,
                lote(0, 30, 35), lote(2, 20, 480));
        producto(0, "Metamizol 500 mg", "Metamizol sódico", "Quimifar", "Blíster x 10 tab", "3.00", "1.30", 5,
                lote(0, 50, 300));
        producto(1, "Ibuprofeno 400 mg", "Ibuprofeno", "Laboratorio del Sur", "Blíster x 10 tab", "3.50", "1.40", 9,
                lote(0, 60, 260), lote(1, 60, 600));
        producto(1, "Naproxeno 550 mg", "Naproxeno sódico", "Biosalud", "Blíster x 10 tab", "6.00", "2.60", 4,
                lote(1, 40, 390));
        producto(1, "Diclofenaco gel 1 %", "Diclofenaco dietilamina", "Medikipu", "Tubo x 50 g", "12.90", "6.80", 3,
                lote(0, 25, 500));
        producto(2, "Amoxicilina 500 mg", "Amoxicilina", "Laboratorios Andinos", "Blíster x 10 cáps", "8.00", "3.50", 5,
                lote(0, 45, 330), lote(2, 30, 700));
        producto(2, "Azitromicina 500 mg", "Azitromicina", "Quimifar", "Caja x 3 tab", "15.00", "6.90", 3,
                lote(1, 25, 450));
        producto(2, "Cefalexina 500 mg", "Cefalexina", "Farma Inca", "Blíster x 10 cáps", "12.00", "5.40", 3,
                lote(0, 16, 280));
        producto(3, "Enalapril 10 mg", "Enalapril maleato", "Laboratorio del Sur", "Blíster x 10 tab", "4.00", "1.60", 4,
                lote(0, 40, 520));
        producto(3, "Losartán 50 mg", "Losartán potásico", "Biosalud", "Blíster x 10 tab", "5.50", "2.20", 5,
                lote(0, 50, 410), lote(2, 30, 690));
        producto(3, "Amlodipino 5 mg", "Amlodipino", "Medikipu", "Blíster x 10 tab", "4.50", "1.80", 3,
                lote(1, 35, 560));
        producto(4, "Metformina 850 mg", "Metformina clorhidrato", "Laboratorios Andinos", "Blíster x 10 tab", "3.80", "1.50", 5,
                lote(0, 60, 380));
        producto(4, "Glibenclamida 5 mg", "Glibenclamida", "Quimifar", "Blíster x 10 tab", "3.20", "1.20", 2,
                lote(1, 30, 610));
        producto(5, "Loratadina 10 mg", "Loratadina", "Farma Inca", "Blíster x 10 tab", "3.00", "1.10", 6,
                lote(0, 50, 300), lote(2, 30, 640));
        producto(5, "Cetirizina 10 mg", "Cetirizina diclorhidrato", "Laboratorio del Sur", "Blíster x 10 tab", "3.50", "1.30", 3,
                lote(1, 40, 470));
        producto(5, "Clorfenamina 4 mg", "Clorfenamina maleato", "Biosalud", "Blíster x 10 tab", "1.50", "0.55", 2,
                lote(0, 40, -10), lote(1, 30, 400));
        producto(6, "Omeprazol 20 mg", "Omeprazol", "Medikipu", "Blíster x 10 cáps", "4.50", "1.70", 8,
                lote(0, 70, 350), lote(1, 50, 520));
        producto(6, "Sales de rehidratación oral", "Electrolitos orales", "Laboratorios Andinos", "Sobre x 27,9 g", "2.00", "0.90", 4,
                lote(0, 60, 240));
        producto(6, "Loperamida 2 mg", "Loperamida clorhidrato", "Quimifar", "Blíster x 6 tab", "3.50", "1.40", 2,
                lote(1, 30, 500));
        producto(7, "Vitamina C 1000 mg efervescente", "Ácido ascórbico", "Farma Inca", "Tubo x 10 tab", "18.00", "9.50", 3,
                lote(0, 30, 600));
        producto(7, "Complejo B", "Tiamina, piridoxina y cianocobalamina", "Laboratorio del Sur", "Caja x 30 tab", "22.00", "11.80", 2,
                lote(1, 20, 540));
        producto(7, "Sulfato ferroso 300 mg", "Sulfato ferroso", "Biosalud", "Frasco x 100 tab", "9.50", "4.20", 2,
                lote(0, 20, 660));
        producto(8, "Ambroxol 30 mg/5 mL jarabe", "Ambroxol clorhidrato", "Medikipu", "Frasco x 120 mL", "9.00", "4.10", 4,
                lote(0, 30, 22), lote(2, 15, 500));
        producto(8, "Dextrometorfano jarabe", "Dextrometorfano bromhidrato", "Laboratorios Andinos", "Frasco x 120 mL", "10.50", "4.80", 3,
                lote(0, 12, 450));
    }

    private record LoteInicial(int ingreso, int cantidad, int diasParaVencer) {}

    private static LoteInicial lote(int ingreso, int cantidad, int diasParaVencer) {
        return new LoteInicial(ingreso, cantidad, diasParaVencer);
    }

    private void producto(int categoria, String nombre, String principioActivo, String laboratorio, String presentacion,
                          String precio, String costo, int peso, LoteInicial... iniciales) {
        if (ingresos.isEmpty()) {
            ingresos.add(new Ingreso("FT F001-00004521", diaHabil(DIAS_DE_HISTORIA + 20, 9), usuarios.quimico()));
            ingresos.add(new Ingreso("FT F001-00004688", diaHabil(DIAS_DE_HISTORIA - 6, 10), usuarios.quimico()));
            ingresos.add(new Ingreso("GR T001-00012870", diaHabil(9, 11), usuarios.quimico()));
        }
        int indice = productos.size();
        productos.add(new Producto(categoria, nombre, principioActivo, laboratorio, presentacion,
                "EN-" + (10000 + random.nextInt(89999)), codigoDeBarras(),
                "Anaquel " + (char) ('A' + categoria) + "-" + (1 + random.nextInt(4)), new BigDecimal(precio)));
        demanda.add(peso);
        BigDecimal costoBase = new BigDecimal(costo);
        for (int i = 0; i < iniciales.length; i++) {
            LoteInicial inicial = iniciales[i];
            Ingreso ingreso = ingresos.get(inicial.ingreso());
            // El costo de compra varía un poco entre lotes.
            BigDecimal costoLote = costoBase.multiply(BigDecimal.valueOf(0.95 + 0.1 * random.nextDouble()))
                    .setScale(2, RoundingMode.HALF_UP);
            String codigo;
            do {
                codigo = String.format("%s%02d%03d", (char) ('A' + random.nextInt(20)),
                        ingreso.fecha().getMonthValue(), 100 + random.nextInt(900));
            } while (!documentos.add("lote:" + indice + ":" + codigo));
            lotes.add(new Lote(indice, inicial.ingreso(), codigo, ahora.toLocalDate().plusDays(inicial.diasParaVencer()),
                    inicial.cantidad(), costoLote, ingreso.fecha()));
        }
    }

    /** EAN-13 ficticio con prefijo de Perú (775) y dígito verificador válido. */
    private String codigoDeBarras() {
        String codigo;
        do {
            StringBuilder base = new StringBuilder("775");
            for (int i = 0; i < 9; i++) base.append(random.nextInt(10));
            int suma = 0;
            for (int i = 0; i < 12; i++) suma += (base.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
            codigo = base.append((10 - suma % 10) % 10).toString();
        } while (!documentos.add(codigo));
        return codigo;
    }

    // ---------------------------------------------------------------- personas

    private void crearClientes() {
        String[][] personas = {
                {"Carmen Rosa", "Quispe Huamán"}, {"José Luis", "Mamani Condori"}, {"María Elena", "Flores Rojas"},
                {"Juan Carlos", "Torres Vargas"}, {"Rosa Amelia", "Ccori Apaza"}, {"Pedro Pablo", "Chávez Salazar"},
                {"Lucía Fernanda", "Ramos Díaz"}, {"Miguel Ángel", "Paredes Soto"}, {"Ana Sofía", "Huanca Ticona"},
                {"Luis Alberto", "Gutiérrez Medina"}, {"Gladys", "Puma Choque"}, {"Víctor Raúl", "Castillo Núñez"},
                {"Elena", "Sánchez Vilca"}, {"Jorge", "Mendoza Llanos"}
        };
        for (String[] p : personas) {
            String usuario = (p[0].split(" ")[0] + "." + p[1].split(" ")[0]).toLowerCase()
                    .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
            clientes.add(new Cliente(p[0], p[1], dni(), celular(), usuario + "@example.com", null, null, null));
        }
        clientes.add(new Cliente("Ricardo", "Álvarez Pinto", dni(), celular(), "compras.cmsantarosa@example.com",
                ruc("20"), "Centro Médico Santa Rosa S.A.C.", "Av. Los Próceres 1450, Lima"));
        clientes.add(new Cliente("Silvia", "Navarro Cruz", dni(), celular(), "logistica.policlinicolima@example.com",
                ruc("20"), "Policlínico Virgen del Carmen E.I.R.L.", "Jr. Huancavelica 320, Lima"));
    }

    private void crearPersonal() {
        personal.add(new Colaborador("Patricia", "Vargas León", "Químico farmacéutico regente", "p.vargas@example.com",
                dni(), String.valueOf(10000 + random.nextInt(9000)), celular(), "MANANA"));
        personal.add(new Colaborador("Martín", "Salas Ruiz", "Químico farmacéutico asistente", "m.salas@example.com",
                dni(), String.valueOf(10000 + random.nextInt(9000)), celular(), "TARDE"));
        personal.add(new Colaborador("Karina", "Ríos Paucar", "Técnica en farmacia", "k.rios@example.com",
                dni(), null, celular(), "MANANA"));
        personal.add(new Colaborador("Diego", "Huamaní Torres", "Técnico en farmacia", "d.huamani@example.com",
                dni(), null, celular(), "TARDE"));
        personal.add(new Colaborador("Milagros", "Cárdenas Soto", "Cajera", "m.cardenas@example.com",
                dni(), null, celular(), "ROTATIVO"));
        personal.add(new Colaborador("Óscar", "Lazo Quispe", "Técnico en farmacia", "o.lazo@example.com",
                dni(), null, celular(), "NOCHE"));
    }

    private String dni() {
        String dni;
        do dni = String.valueOf(10_000_000 + random.nextInt(79_999_999)); while (!documentos.add(dni));
        return dni;
    }

    private String celular() {
        return "9" + String.format("%08d", random.nextInt(100_000_000));
    }

    /** RUC ficticio de 11 dígitos con dígito verificador válido. */
    private String ruc(String prefijo) {
        int[] factores = {5, 4, 3, 2, 7, 6, 5, 4, 3, 2};
        String ruc;
        do {
            StringBuilder base = new StringBuilder(prefijo);
            while (base.length() < 10) base.append(random.nextInt(10));
            int suma = 0;
            for (int i = 0; i < 10; i++) suma += (base.charAt(i) - '0') * factores[i];
            int digito = 11 - suma % 11;
            ruc = base.append(digito == 10 ? 0 : digito == 11 ? 1 : digito).toString();
        } while (!documentos.add(ruc));
        return ruc;
    }

    // ------------------------------------------------------- ventas y bajas

    private record AjustePlan(int diasAtras, int producto, int cantidad, String motivo, String observacion,
                              boolean loteVencido) {}

    private void simularMovimientos() {
        List<AjustePlan> planes = List.of(
                new AjustePlan(22, 20, 2, "DANIO", "Tubos aplastados al recibir la mercadería", false),
                new AjustePlan(15, 3, 1, "CONTEO", "Diferencia en el conteo semanal", false),
                new AjustePlan(8, 18, 3, "MERMA", "Sobres humedecidos en el almacén", false),
                new AjustePlan(4, 16, 5, "VENCIMIENTO", "Retiro parcial de lote vencido", true));
        int numero = 1;
        for (int dia = DIAS_DE_HISTORIA; dia >= 0; dia--) {
            LocalDate fecha = ahora.toLocalDate().minusDays(dia);
            List<LocalDateTime> horas = horasDeVenta(fecha);
            List<Object> eventos = new ArrayList<>();
            for (LocalDateTime hora : horas) eventos.add(hora);
            for (AjustePlan plan : planes) if (plan.diasAtras() == dia) eventos.add(plan);
            eventos.sort(Comparator.comparing(e -> e instanceof LocalDateTime h ? h : fecha.atTime(13, 30)));
            for (Object evento : eventos) {
                if (evento instanceof LocalDateTime hora) {
                    Venta venta = vender(numero, hora);
                    if (venta != null) {
                        ventas.add(venta);
                        numero++;
                    }
                } else {
                    ajustar((AjustePlan) evento, fecha.atTime(13, 30));
                }
            }
        }
        for (int p = 0; p < productos.size(); p++) {
            final int producto = p;
            int vendidas = ventas.stream().flatMap(v -> v.lineas().stream())
                    .filter(l -> l.producto() == producto).mapToInt(Linea::cantidad).sum();
            stockMinimo.add(Math.max(5, (int) Math.ceil(vendidas * 7.0 / DIAS_DE_HISTORIA)));
        }
    }

    /** Entre 4 y 9 ventas al día; la mayoría de mañana y tarde, algunas de noche. Hoy, solo hasta la hora actual. */
    private List<LocalDateTime> horasDeVenta(LocalDate fecha) {
        int cantidad = 4 + random.nextInt(6) + (fecha.getDayOfWeek().getValue() >= 6 ? 2 : 0);
        List<LocalDateTime> horas = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) {
            double r = random.nextDouble();
            int hora = r < 0.45 ? 7 + random.nextInt(8) : r < 0.92 ? 15 + random.nextInt(8) : (random.nextBoolean() ? 23 : 6);
            LocalDateTime momento = fecha.atTime(hora, random.nextInt(60), random.nextInt(60));
            if (momento.isBefore(ahora.minusMinutes(5))) horas.add(momento);
        }
        horas.sort(Comparator.naturalOrder());
        return horas;
    }

    private Venta vender(int numero, LocalDateTime fecha) {
        int cantidadLineas = random.nextDouble() < 0.55 ? 1 : random.nextDouble() < 0.67 ? 2 : 3;
        List<Linea> lineas = new ArrayList<>();
        Set<Integer> usados = new HashSet<>();
        boolean conReceta = false;
        for (int i = 0; i < cantidadLineas; i++) {
            int producto = productoAlAzar(usados);
            usados.add(producto);
            int deseada = random.nextDouble() < 0.6 ? 1 : random.nextDouble() < 0.75 ? 2 : 3;
            List<Asignacion> asignaciones = asignarFefo(producto, deseada, fecha);
            int cantidad = asignaciones.stream().mapToInt(Asignacion::cantidad).sum();
            if (cantidad == 0) continue;
            for (Asignacion a : asignaciones) lotes.get(a.lote()).disponible -= a.cantidad();
            BigDecimal precio = productos.get(producto).precio();
            lineas.add(new Linea(producto, cantidad, precio, precio.multiply(BigDecimal.valueOf(cantidad)), asignaciones));
            String condicion = categorias.get(productos.get(producto).categoria()).condicionVenta();
            conReceta |= !"VENTA_LIBRE".equals(condicion);
        }
        if (lineas.isEmpty()) return null;

        BigDecimal total = lineas.stream().map(Linea::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        Integer cliente = random.nextDouble() < (conReceta ? 0.7 : 0.25) ? random.nextInt(clientes.size() - 2) : null;
        String metodo = metodoDePago();
        BigDecimal recibido = "EFECTIVO".equals(metodo) ? efectivoEntregado(total) : total;
        return new Venta(numero, fecha, cliente, vendedor(fecha), metodo, total, recibido, recibido.subtract(total), lineas);
    }

    private int productoAlAzar(Set<Integer> excluidos) {
        int total = 0;
        for (int i = 0; i < demanda.size(); i++) if (!excluidos.contains(i)) total += demanda.get(i);
        int r = random.nextInt(total);
        for (int i = 0; i < demanda.size(); i++) {
            if (excluidos.contains(i)) continue;
            r -= demanda.get(i);
            if (r < 0) return i;
        }
        return 0;
    }

    /** Primero vence, primero sale: solo lotes ya recibidos y vigentes en la fecha de la venta. */
    private List<Asignacion> asignarFefo(int producto, int cantidad, LocalDateTime fecha) {
        List<Integer> candidatos = new ArrayList<>();
        for (int i = 0; i < lotes.size(); i++) {
            Lote l = lotes.get(i);
            if (l.producto == producto && l.disponible > 0 && !l.creado.isAfter(fecha)
                    && !l.vence.isBefore(fecha.toLocalDate())) {
                candidatos.add(i);
            }
        }
        candidatos.sort(Comparator.comparing((Integer i) -> lotes.get(i).vence).thenComparing(i -> lotes.get(i).creado));
        List<Asignacion> asignaciones = new ArrayList<>();
        int pendiente = cantidad;
        for (int i : candidatos) {
            if (pendiente == 0) break;
            int tomar = Math.min(pendiente, lotes.get(i).disponible);
            asignaciones.add(new Asignacion(i, tomar));
            pendiente -= tomar;
        }
        return asignaciones;
    }

    private void ajustar(AjustePlan plan, LocalDateTime fecha) {
        for (int i = 0; i < lotes.size(); i++) {
            Lote l = lotes.get(i);
            boolean vencido = l.vence.isBefore(fecha.toLocalDate());
            if (l.producto != plan.producto() || l.disponible == 0 || l.creado.isAfter(fecha)
                    || vencido != plan.loteVencido()) {
                continue;
            }
            int cantidad = Math.min(plan.cantidad(), l.disponible);
            l.disponible -= cantidad;
            ajustes.add(new Ajuste(i, cantidad, plan.motivo(), plan.observacion(), fecha, usuarios.quimico()));
            return;
        }
    }

    private String metodoDePago() {
        double r = random.nextDouble();
        return r < 0.55 ? "EFECTIVO" : r < 0.80 ? "YAPE" : r < 0.88 ? "PLIN" : "TARJETA";
    }

    /** El cliente paga justo o con el billete inmediato superior. */
    private BigDecimal efectivoEntregado(BigDecimal total) {
        if (random.nextDouble() < 0.3) return total;
        for (int billete : new int[]{10, 20, 50, 100, 200}) {
            if (total.compareTo(BigDecimal.valueOf(billete)) <= 0) return BigDecimal.valueOf(billete).setScale(2);
        }
        return total.setScale(0, RoundingMode.UP).setScale(2);
    }

    private String vendedor(LocalDateTime fecha) {
        int hora = fecha.getHour();
        double r = random.nextDouble();
        if (hora >= 7 && hora < 15) return r < 0.6 ? usuarios.cajero() : usuarios.quimico();
        if (hora >= 15 && hora < 23) return r < 0.5 ? usuarios.cajero() : r < 0.8 ? usuarios.quimico() : usuarios.gerente();
        return usuarios.cajero();
    }

    /** Un día y hora de la mañana {@code diasAtras} días antes de hoy (sin domingos). */
    private LocalDateTime diaHabil(int diasAtras, int hora) {
        LocalDate fecha = ahora.toLocalDate().minusDays(diasAtras);
        if (fecha.getDayOfWeek().getValue() == 7) fecha = fecha.minusDays(1);
        return fecha.atTime(hora, 15);
    }
}
