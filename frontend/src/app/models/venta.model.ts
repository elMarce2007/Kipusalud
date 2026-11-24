export interface DetalleVenta {
  id?: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productoNombre?: string;
  /** Copia tomada al vender (backend: nombreProducto); sirve para imprimir el comprobante. */
  nombreProducto?: string | null;
  afectacionIgv?: string | null;
  precioIncluyeIgv?: boolean | null;
}

/** Comprobante elegido al registrar la venta. */
export type TipoComprobante = 'BOLETA_INTERNA' | 'BOLETA_ELECTRONICA' | 'FACTURA';

export const TIPOS_COMPROBANTE: Record<TipoComprobante, string> = {
  BOLETA_INTERNA: 'Boleta',
  BOLETA_ELECTRONICA: 'Boleta electrónica',
  FACTURA: 'Factura'
};

export interface Venta {
  id?: number;
  fecha: Date | string;
  clienteId: number | null;
  total: number;
  detalles: DetalleVenta[];
  clienteNombre?: string;
  metodoPago?: MetodoPago;
  montoRecibido?: number;
  vuelto?: number;
  confirmacionManualPago?: boolean;
  pagoConfirmadoPor?: string;
  pagoConfirmadoEn?: Date | string;
  estado?: string;
  /** Clave con la que el inventario registró la salida de esta venta. */
  claveIdempotencia?: string;
  tipoComprobante?: TipoComprobante;
  serieComprobante?: string | null;
  numeroComprobante?: string | null;
}

export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA';

export interface VentaCreate {
  claveIdempotencia: string;
  /** Opcional en boletas ("Público general"); obligatorio en facturas. */
  clienteId: number | null;
  tipoComprobante: TipoComprobante;
  metodoPago: MetodoPago;
  montoRecibido: number;
  confirmacionManualPago: boolean;
  detalles: {
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}
