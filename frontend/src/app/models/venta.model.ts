export interface DetalleVenta {
  id?: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productoNombre?: string;
}

export interface Venta {
  id?: number;
  fecha: Date | string;
  clienteId: number;
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
}

export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA';

export interface VentaCreate {
  claveIdempotencia: string;
  clienteId: number;
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
