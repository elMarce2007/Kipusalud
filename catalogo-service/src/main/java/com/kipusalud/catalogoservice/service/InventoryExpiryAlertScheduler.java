package com.kipusalud.catalogoservice.service;

import com.kipusalud.catalogoservice.entity.LoteInventario;
import com.kipusalud.catalogoservice.repository.LoteInventarioRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Component
public class InventoryExpiryAlertScheduler {
    private final LoteInventarioRepository lotes;
    private final ProductoRepository productos;
    private final DomainEventOutbox outbox;

    public InventoryExpiryAlertScheduler(
            LoteInventarioRepository lotes, ProductoRepository productos, DomainEventOutbox outbox) {
        this.lotes = lotes;
        this.productos = productos;
        this.outbox = outbox;
    }

    @Scheduled(cron = "${kipusalud.events.expiry-alert-cron:0 0 8 * * *}")
    @Transactional
    public void publishUpcomingExpiryAlerts() {
        LocalDate today = LocalDate.now();
        for (LoteInventario lot : lotes.findAllWithAvailableStockAndExpiryBetween(today, today.plusDays(30))) {
            long days = ChronoUnit.DAYS.between(today, lot.getFechaVencimiento());
            String level = days <= 7 ? "ALTA" : "MEDIA";
            String dedupeKey = "expiry:" + lot.getId() + ":" + level;
            if (outbox.alreadyRecorded(dedupeKey)) continue;
            var product = productos.findByIdAndFarmaciaId(lot.getProductoId(), lot.getFarmaciaId())
                    .orElseThrow(() -> new IllegalStateException("Lote asociado a un producto inexistente"));
            outbox.recordForTenant(lot.getFarmaciaId(), "sistema", "inventario.vencimiento", lot.getId(),
                    dedupeKey, Map.of("productoId", product.getId(), "producto", product.getNombre(),
                            "loteId", lot.getId(), "codigoLote", lot.getCodigoLote(),
                            "fechaVencimiento", lot.getFechaVencimiento().toString(),
                            "diasParaVencer", days, "cantidad", lot.getCantidadDisponible(), "prioridad", level));
        }
    }
}
