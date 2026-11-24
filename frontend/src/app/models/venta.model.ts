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
  /** Usuario que registró la venta (despachador). */
  registradoPor?: string | null;
  /** Copia del cliente al vender. */
  clienteNombre?: string | null;
  clienteDocumento?: string | null;
}

/** Compras confirmadas de un cliente. */
export interface ResumenCliente {
  clienteId: number;
  compras: number;
  totalComprado: number;
  ultimaCompra: string;
}

/** Nombre a mostrar: la copia guardada al vender, o "Público general" si no hubo cliente. */
export function clienteDeVenta(v: Venta, nombres?: Map<number, string>): string {
  if (v.clienteNombre) return v.clienteNombre;
  if (!v.clienteId) return 'Público general';
  return nombres?.get(v.clienteId) ?? `Cliente #${v.clienteId}`;
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
