export type CondicionVenta = 'VENTA_LIBRE' | 'RECETA' | 'RECETA_RETENIDA';

export interface Categoria {
  id?: number;
  nombre: string;
  descripcion: string;
  /** Código ATC (clasificación anatómica, terapéutica y química), p. ej. N02BE. */
  codigoAtc?: string | null;
  condicionVenta?: CondicionVenta | null;
}

export const CONDICIONES_VENTA: { valor: CondicionVenta; etiqueta: string; tono: 'ok' | 'warn' | 'danger' }[] = [
  { valor: 'VENTA_LIBRE', etiqueta: 'Venta libre', tono: 'ok' },
  { valor: 'RECETA', etiqueta: 'Con receta médica', tono: 'warn' },
  { valor: 'RECETA_RETENIDA', etiqueta: 'Receta retenida', tono: 'danger' }
];

export function condicionDeVenta(valor: string | null | undefined) {
  return CONDICIONES_VENTA.find(c => c.valor === valor) ?? CONDICIONES_VENTA[0];
}
