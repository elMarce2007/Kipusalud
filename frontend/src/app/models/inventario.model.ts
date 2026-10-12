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
