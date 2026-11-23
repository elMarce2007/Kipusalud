/** Perfil fiscal de la farmacia (emisor y series). Nunca incluye secretos. */
export interface SunatConfiguracion {
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  serieFactura: string;
  serieBoleta: string | null;
  telefono: string | null;
  email: string | null;
  credencialesConfiguradas: boolean;
}

/** Series usadas al registrar los datos de la empresa por primera vez; se cambian en Administración. */
export const SERIE_FACTURA_INICIAL = 'F001';
export const SERIE_BOLETA_INICIAL = 'B001';

export interface PerfilFiscalRequest {
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  serieFactura: string;
  serieBoleta: string;
  telefono: string | null;
  email: string | null;
}

/** Se guardan aparte del perfil y reemplazan las credenciales anteriores. */
export interface CredencialesSunatRequest {
  usuarioSol: string;
  claveSol: string;
  certificadoPkcs12Base64: string;
  claveCertificado: string;
}

/** Datos públicos del emisor que se imprimen en el comprobante. */
export interface EmisorComprobante {
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;
  telefono: string | null;
  email: string | null;
}

/** Comprobantes que el punto de venta puede ofrecer. */
export interface OpcionesComprobante {
  boletaElectronicaDisponible: boolean;
  facturaDisponible: boolean;
  motivoNoDisponible: string | null;
  montoMinimoBoletaConDocumento: number;
  emisor: EmisorComprobante | null;
}

export type EstadoComprobante =
  | 'PREPARADA'
  | 'ENVIANDO'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'RESULTADO_DESCONOCIDO';

export interface ComprobanteElectronico {
  id: number;
  ventaId: number;
  tipoComprobante: string;
  serie: string;
  numero: string;
  estado: EstadoComprobante;
  codigoRespuesta: string | null;
  descripcionRespuesta: string | null;
  fechaCreacion: string;
  fechaRespuesta: string | null;
}

export const ESTADOS_COMPROBANTE: Record<EstadoComprobante, { etiqueta: string; ayuda: string }> = {
  PREPARADA: {
    etiqueta: 'Preparada',
    ayuda: 'El XML está firmado pero aún no se envió a SUNAT.'
  },
  ENVIANDO: {
    etiqueta: 'Enviando',
    ayuda: 'El envío a SUNAT está en curso.'
  },
  ACEPTADA: {
    etiqueta: 'Aceptada por SUNAT',
    ayuda: 'SUNAT aceptó el comprobante y devolvió su constancia (CDR).'
  },
  RECHAZADA: {
    etiqueta: 'Rechazada por SUNAT',
    ayuda: 'SUNAT rechazó el comprobante. Revisa el motivo.'
  },
  RESULTADO_DESCONOCIDO: {
    etiqueta: 'Resultado desconocido',
    ayuda: 'No hubo una respuesta clara de SUNAT. Consulta su estado antes de reenviar para evitar duplicados.'
  }
};
