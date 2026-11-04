export interface Producto {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  categoriaId: number;
  categoriaNombre?: string;
}

export interface AltaProductoRequest {
  producto: Producto;
  ingresoInicial: {
    referenciaDocumento: string | null;
    codigoLote: string;
    fechaVencimiento: string;
    cantidad: number;
  } | null;
}
