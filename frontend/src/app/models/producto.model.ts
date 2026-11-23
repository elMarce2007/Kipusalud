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
  } | null;
}
