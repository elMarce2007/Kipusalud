package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.entity.LoteInventario;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

final class FefoAllocator {

    private FefoAllocator() {}

    static List<Allocation> allocate(List<LoteInventario> lots, int requested, LocalDate today) {
        if (requested < 1) {
            throw new IllegalArgumentException("La cantidad solicitada debe ser positiva");
        }
        List<LoteInventario> eligible = lots.stream()
                .filter(LoteInventario::isVerificado)
                .filter(lot -> lot.getCantidadDisponible() != null && lot.getCantidadDisponible() > 0)
                .filter(lot -> lot.getFechaVencimiento() != null
                        && !lot.getFechaVencimiento().isBefore(today))
                .sorted(Comparator.comparing(LoteInventario::getFechaVencimiento)
                        .thenComparing(LoteInventario::getCreadoEn))
                .toList();

        long available = eligible.stream().mapToLong(LoteInventario::getCantidadDisponible).sum();
        if (available < requested) {
            throw new IllegalArgumentException("No hay suficientes unidades disponibles en lotes FEFO");
        }

        List<Allocation> allocations = new ArrayList<>();
        int remaining = requested;
        for (LoteInventario lot : eligible) {
            if (remaining == 0) {
                break;
            }
            int allocated = Math.min(remaining, lot.getCantidadDisponible());
            allocations.add(new Allocation(lot, allocated));
            remaining -= allocated;
        }
        return List.copyOf(allocations);
    }

    record Allocation(LoteInventario lot, int quantity) {}
}
