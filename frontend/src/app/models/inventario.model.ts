export interface LoteInventario {
  id: number;
  productoId: number;
  codigoLote: string;
  fechaVencimiento: string | null;
  cantidadInicial: number;
  cantidadDisponible: number;
  verificado: boolean;
  creadoEn: string;
}

export interface LineaIngresoInventario {
  productoId: number;
  codigoLote: string;
  fechaVencimiento: string;
  cantidad: number;
}

export interface IngresoInventarioRequest {
  claveIdempotencia: string;
  referenciaDocumento: string | null;
  lineas: LineaIngresoInventario[];
}

export interface IngresoInventarioResult {
  id: number;
  claveIdempotencia: string;
  referenciaDocumento: string | null;
  creadoPor: string;
  creadoEn: string;
  repetido: boolean;
}

export interface MovimientoInventario {
  id: number;
  productoId: number;
  loteId: number | null;
  tipo: string;
  cantidad: number;
  claveIdempotencia: string;
  actor: string;
  creadoEn: string;
  codigoLote?: string | null;
  fechaVencimiento?: string | null;
  motivo?: string | null;
  observacion?: string | null;
}

export interface AlertaInventario {
  tipo: string;
  productoId: number;
  producto: string;
  loteId: number | null;
  codigoLote: string | null;
  fechaVencimiento: string | null;
  cantidad: number;
  prioridad: string;
}

/** Estado de inventario por producto con su lote FEFO activo. */
export interface ResumenInventario {
  productoId: number;
  stock: number;
  stockMinimo: number | null;
  lotesVigentes: number;
  unidadesVencidas: number;
  lotesPorVencer: number;
  loteFefo: {
    loteId: number;
    codigoLote: string;
    fechaVencimiento: string;
    cantidadDisponible: number;
  } | null;
}

/** Vista previa de los lotes que usaría una venta (no descuenta nada). */
export interface AsignacionFefo {
  productoId: number;
  cantidadSolicitada: number;
  completa: boolean;
  faltante: number;
  lotes: { loteId: number; codigoLote: string; fechaVencimiento: string; cantidad: number }[];
}

/** Lotes de los que salió cada producto de una venta. */
export interface LotesDeVenta {
  claveIdempotencia: string;
  lineas: {
    productoId: number;
    loteId: number;
    codigoLote: string;
    cantidad: number;
    creadoEn: string;
    fechaVencimiento: string | null;
  }[];
}

export type MotivoAjuste = 'MERMA' | 'VENCIMIENTO' | 'DANIO' | 'CONTEO' | 'DEVOLUCION_PROVEEDOR' | 'OTRO';

export const MOTIVOS_AJUSTE: { valor: MotivoAjuste; etiqueta: string }[] = [
  { valor: 'MERMA', etiqueta: 'Merma' },
  { valor: 'VENCIMIENTO', etiqueta: 'Producto vencido' },
  { valor: 'DANIO', etiqueta: 'Daño o rotura' },
  { valor: 'CONTEO', etiqueta: 'Faltante en conteo físico' },
  { valor: 'DEVOLUCION_PROVEEDOR', etiqueta: 'Devolución al proveedor' },
  { valor: 'OTRO', etiqueta: 'Otro (describir)' }
];

export interface AjusteInventarioRequest {
  claveIdempotencia: string;
  loteId: number;
  cantidad: number;
  motivo: MotivoAjuste;
  observacion: string | null;
}

export interface AjusteInventario {
  movimientoId: number;
  productoId: number;
  loteId: number;
  codigoLote: string;
  cantidadRetirada: number;
  motivo: string;
  observacion: string | null;
  stockProducto: number;
  cantidadDisponibleLote: number;
  actor: string;
  creadoEn: string;
  repetido: boolean;
}

/** Días que faltan para el vencimiento (negativo si ya venció). */
export function diasParaVencer(fecha: string | null | undefined, hoy = new Date()): number | null {
  if (!fecha) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  const inicio = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((Date.UTC(a, m - 1, d) - inicio) / 86_400_000);
}

/** Tono del vencimiento: vencido o menos de 30 días (danger), menos de 90 (warn), resto (ok). */
export function tonoVencimiento(fecha: string | null | undefined): 'ok' | 'warn' | 'danger' | 'neutral' {
  const dias = diasParaVencer(fecha);
  if (dias === null) return 'neutral';
  if (dias < 30) return 'danger';
  if (dias < 90) return 'warn';
  return 'ok';
}
