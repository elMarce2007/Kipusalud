export interface Cliente {
  id?: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  ruc?: string | null;
  razonSocial?: string | null;
  direccionFiscal?: string | null;
}

/** Un cliente puede recibir factura si tiene RUC, razón social y dirección fiscal. */
export function clienteFacturable(cliente: Cliente | null | undefined): boolean {
  return !!cliente && /^\d{11}$/.test(cliente.ruc?.trim() ?? '')
    && !!cliente.razonSocial?.trim() && !!cliente.direccionFiscal?.trim();
}
