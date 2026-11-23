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
