package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantTestSupport;
import com.kipusalud.ventasservice.dto.ReporteVentasTurnoDto;
import com.kipusalud.ventasservice.entity.Venta;
import com.kipusalud.ventasservice.repository.VentaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReporteVentasServiceTest {

    private final VentaRepository repositorio = mock(VentaRepository.class);
    private final ReporteVentasService service = new ReporteVentasService(repositorio);

    @AfterEach
    void limpiar() {
        TenantTestSupport.limpiar();
    }

    @Test
    void clasificaLaHoraEnTurnos() {
        assertEquals("MANANA", ReporteVentasService.turnoDe(LocalDateTime.of(2026, 11, 1, 7, 0)));
        assertEquals("TARDE", ReporteVentasService.turnoDe(LocalDateTime.of(2026, 11, 1, 22, 59)));
        assertEquals("NOCHE", ReporteVentasService.turnoDe(LocalDateTime.of(2026, 11, 1, 23, 0)));
        assertEquals("NOCHE", ReporteVentasService.turnoDe(LocalDateTime.of(2026, 11, 1, 6, 59)));
    }

    @Test
    void agrupaSoloLasVentasConfirmadas() {
        TenantTestSupport.usar(4L, "ADMINISTRADOR");
        LocalDate dia = LocalDate.of(2026, 11, 10);
        when(repositorio.findAllByFarmaciaIdAndFechaGreaterThanEqualAndFechaBeforeOrderByFechaAsc(eq(4L), any(), any()))
                .thenReturn(List.of(
                        venta(dia.atTime(9, 30), "10.00", "ana", "EFECTIVO", "CONFIRMADA"),
                        venta(dia.atTime(16, 0), "20.00", "luis", "YAPE", "CONFIRMADA"),
                        venta(dia.atTime(23, 30), "5.50", "luis", "EFECTIVO", "CONFIRMADA"),
                        venta(dia.atTime(12, 0), "99.00", "ana", "EFECTIVO", "PENDIENTE_INVENTARIO")));

        ReporteVentasTurnoDto r = service.porTurno(dia, dia);

        assertEquals(3, r.ventas());
        assertEquals(new BigDecimal("35.50"), r.total());
        assertEquals(new BigDecimal("11.83"), r.ticketPromedio());
        assertEquals(1, r.noConfirmadas());
        assertEquals(List.of("MANANA", "TARDE", "NOCHE"), r.porTurno().stream().map(ReporteVentasTurnoDto.Grupo::clave).toList());
        assertEquals(new BigDecimal("10.00"), r.porTurno().get(0).total());
        assertEquals("luis", r.porVendedor().get(0).clave());
        assertEquals(new BigDecimal("5.50"), r.porDia().get(0).noche());
    }

    @Test
    void rechazaPeriodosInvertidos() {
        TenantTestSupport.usar(4L, "ADMINISTRADOR");
        assertThrows(ResponseStatusException.class,
                () -> service.porTurno(LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 1)));
    }

    private Venta venta(LocalDateTime fecha, String total, String vendedor, String metodo, String estado) {
        Venta v = new Venta();
        v.setFecha(fecha);
        v.setTotal(new BigDecimal(total));
        v.setRegistradoPor(vendedor);
        v.setMetodoPago(metodo);
        v.setEstado(estado);
        return v;
    }
}
