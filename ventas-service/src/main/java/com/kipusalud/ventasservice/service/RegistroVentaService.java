package com.kipusalud.ventasservice.service;

import com.kipusalud.ventasservice.dto.VentaDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Registra la venta y, si el comprobante elegido es electrónico, lo emite en SUNAT.
 *
 * La emisión ocurre después de que la venta quedó confirmada y su transacción se cerró:
 * es una llamada de red que no debe mantener bloqueos ni deshacer una venta cuyo stock
 * ya salió. Si SUNAT falla, el comprobante queda registrado con su estado (rechazado o
 * desconocido) y se resuelve desde el detalle de la venta.
 */
@Service
public class RegistroVentaService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RegistroVentaService.class);

    private final VentaService ventaService;
    private final FacturaSunatService facturaSunatService;

    public RegistroVentaService(VentaService ventaService, FacturaSunatService facturaSunatService) {
        this.ventaService = ventaService;
        this.facturaSunatService = facturaSunatService;
    }

    public VentaDto registrar(VentaDto solicitud) {
        return emitirSiCorresponde(ventaService.crear(solicitud));
    }

    public VentaDto reintentar(Long ventaId) {
        return emitirSiCorresponde(ventaService.reintentar(ventaId));
    }

    private VentaDto emitirSiCorresponde(VentaDto venta) {
        if (!"CONFIRMADA".equals(venta.estado()) || !esElectronico(venta.tipoComprobante())) {
            return venta;
        }
        try {
            facturaSunatService.emitir(venta.id());
        } catch (RuntimeException e) {
            // La venta ya está confirmada; el comprobante pendiente se gestiona desde su detalle.
            LOGGER.warn("La venta {} se confirmó, pero su comprobante electrónico no se emitió: {}",
                    venta.id(), e.getMessage());
        }
        return ventaService.obtener(venta.id());
    }

    private boolean esElectronico(String tipo) {
        return VentaServiceImpl.BOLETA_ELECTRONICA.equals(tipo) || VentaServiceImpl.FACTURA.equals(tipo);
    }
}
