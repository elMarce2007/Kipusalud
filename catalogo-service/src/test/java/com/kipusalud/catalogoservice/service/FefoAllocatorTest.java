package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.entity.LoteInventario;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FefoAllocatorTest {

    @Test
    void allocatesOldestExpiryFirstAndSkipsExpiredOrUnverifiedLots() {
        LocalDate today = LocalDate.of(2026, 10, 7);
        LoteInventario later = lot("B", today.plusDays(60), 8, true, 2);
        LoteInventario earliest = lot("A", today.plusDays(10), 3, true, 1);
        LoteInventario expired = lot("OLD", today.minusDays(1), 100, true, 0);
        LoteInventario unverified = lot("LEGACY", today.plusDays(1), 100, false, 0);

        List<FefoAllocator.Allocation> result = FefoAllocator.allocate(
                List.of(later, expired, unverified, earliest), 6, today);

        assertEquals(List.of("A", "B"), result.stream()
                .map(allocation -> allocation.lot().getCodigoLote()).toList());
        assertEquals(List.of(3, 3), result.stream()
                .map(FefoAllocator.Allocation::quantity).toList());
        assertEquals(3, earliest.getCantidadDisponible());
        assertEquals(8, later.getCantidadDisponible());
    }

    @Test
    void rejectsInsufficientEligibleStockWithoutChangingLots() {
        LocalDate today = LocalDate.of(2026, 10, 7);
        LoteInventario onlyLot = lot("A", today.plusDays(1), 2, true, 0);

        assertThrows(IllegalArgumentException.class,
                () -> FefoAllocator.allocate(List.of(onlyLot), 3, today));
        assertEquals(2, onlyLot.getCantidadDisponible());
    }

    private LoteInventario lot(
            String code, LocalDate expiry, int available, boolean verified, int createdOffset
    ) {
        LoteInventario lot = new LoteInventario();
        lot.setCodigoLote(code);
        lot.setFechaVencimiento(expiry);
        lot.setCantidadDisponible(available);
        lot.setVerificado(verified);
        lot.setCreadoEn(LocalDateTime.of(2026, 1, 1, 0, 0).plusDays(createdOffset));
        return lot;
    }
}
