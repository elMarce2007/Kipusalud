export type Turno = 'MANANA' | 'TARDE' | 'NOCHE' | 'ROTATIVO';

export interface Personal {
  id?: number;
  nombres: string;
  apellidos: string;
  cargo: string;
  email: string;
  dni?: string | null;
  /** Número de colegiatura (CQFP) del químico farmacéutico. */
  colegiatura?: string | null;
  telefono?: string | null;
  turno?: Turno | null;
  activo?: boolean | null;
}

export const TURNOS: { valor: Turno; etiqueta: string }[] = [
  { valor: 'MANANA', etiqueta: 'Mañana' },
  { valor: 'TARDE', etiqueta: 'Tarde' },
  { valor: 'NOCHE', etiqueta: 'Noche' },
  { valor: 'ROTATIVO', etiqueta: 'Rotativo' }
];

export function etiquetaTurno(valor: string | null | undefined): string {
  return TURNOS.find(t => t.valor === valor)?.etiqueta ?? 'Sin turno';
}
