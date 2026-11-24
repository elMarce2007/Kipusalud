export interface Producto {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  categoriaId: number;
  categoriaNombre?: string;
  /** Catálogo 07 de SUNAT: 10 gravado, 20 exonerado, 30 inafecto. */
  afectacionIgv?: AfectacionIgv | null;
  precioIncluyeIgv?: boolean | null;
  /** Ficha técnica (opcional). */
  principioActivo?: string | null;
  laboratorio?: string | null;
  presentacion?: string | null;
  registroSanitario?: string | null;
  /** Único por farmacia; se usa para buscar en el punto de venta. */
  codigoBarras?: string | null;
  /** Estante o anaquel donde se guarda. */
  ubicacion?: string | null;
}

/** Coincide por nombre, principio activo, laboratorio o código de barras exacto. */
export function coincideProducto(p: Producto, termino: string): boolean {
  const t = termino.trim().toLowerCase();
  if (!t) return true;
  if (p.codigoBarras && p.codigoBarras.toLowerCase() === t) return true;
  return [p.nombre, p.principioActivo, p.laboratorio, p.descripcion]
    .some(v => !!v && v.toLowerCase().includes(t));
}

export type AfectacionIgv = '10' | '20' | '30';

export const AFECTACIONES_IGV: { codigo: AfectacionIgv; etiqueta: string }[] = [
  { codigo: '10', etiqueta: '10 · Gravado (paga IGV)' },
  { codigo: '20', etiqueta: '20 · Exonerado' },
  { codigo: '30', etiqueta: '30 · Inafecto' }
];

export interface AltaProductoRequest {
  producto: Producto;
  ingresoInicial: {
    referenciaDocumento: string | null;
    codigoLote: string;
    fechaVencimiento: string;
    cantidad: number;
    costoUnitario?: number | null;
  } | null;
}

/** "Principio activo · presentación · laboratorio" con los datos que existan. */
export function resumenFicha(p: Producto, incluirLaboratorio = false): string {
  return [p.principioActivo, p.presentacion, incluirLaboratorio ? p.laboratorio : null]
    .filter(v => !!v).join(' · ');
}
