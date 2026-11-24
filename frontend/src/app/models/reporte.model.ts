/** Kardex físico-valorizado de un producto (GET /api/inventario/reportes/kardex). */
export interface KardexValorizado {
  productoId: number;
  producto: string;
  principioActivo: string | null;
  presentacion: string | null;
  registroSanitario: string | null;
  desde: string;
  hasta: string;
  saldoInicialUnidades: number;
  saldoInicialValor: number;
  totalEntradas: number;
  totalSalidas: number;
  saldoFinalUnidades: number;
  saldoFinalValor: number;
  costoPromedio: number | null;
  unidadesSinCosto: number;
  filas: FilaKardex[];
}

export interface FilaKardex {
  id: number;
  fecha: string;
  tipo: string;
  referencia: string;
  codigoLote: string | null;
  fechaVencimiento: string | null;
  entrada: number;
  salida: number;
  saldoUnidades: number;
  costoUnitario: number | null;
  saldoValor: number;
  actor: string;
}

/** Bajas de inventario del período (GET /api/inventario/reportes/mermas). */
export interface ReporteMermas {
  desde: string;
  hasta: string;
  unidadesMerma: number;
  valorMerma: number;
  unidadesVendidas: number;
  /** Porcentaje de bajas sobre las unidades que salieron. */
  tasaMerma: number;
  porMotivo: { motivo: string; unidades: number; valor: number }[];
  filas: {
    id: number;
    fecha: string;
    productoId: number;
    producto: string;
    codigoLote: string | null;
    fechaVencimiento: string | null;
    motivo: string;
    observacion: string | null;
    cantidad: number;
    costoUnitario: number | null;
    valor: number | null;
    actor: string;
  }[];
}

export interface GrupoVentas { clave: string; ventas: number; total: number; }

/** Ventas confirmadas por turno (GET /api/ventas/reportes/turnos). */
export interface ReporteVentasTurno {
  desde: string;
  hasta: string;
  ventas: number;
  total: number;
  ticketPromedio: number;
  noConfirmadas: number;
  porTurno: GrupoVentas[];
  porVendedor: GrupoVentas[];
  porMetodoPago: GrupoVentas[];
  porDia: { fecha: string; manana: number; tarde: number; noche: number; total: number }[];
}

/** Tasa de merma tolerada (%) para el indicador. */
export const TASA_MERMA_TOLERADA = 1.5;

/** Primer y último día del mes en formato ISO, en hora local. */
export function rangoDelMes(fecha = new Date()): { desde: string; hasta: string } {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { desde: iso(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), hasta: iso(fecha) };
}

/** Participación (0-100) de un importe sobre el total, sin decimales. */
export function participacion(parte: number, total: number): number {
  return total > 0 ? Math.round(parte * 100 / total) : 0;
}
