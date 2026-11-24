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

/** Horario de cada turno; coincide con el reporte de ventas por turno del servidor. */
export const HORARIO_TURNO: Record<Turno, string> = {
  MANANA: '07:00 – 15:00',
  TARDE: '15:00 – 23:00',
  NOCHE: '23:00 – 07:00',
  ROTATIVO: 'Según programación'
};

export function etiquetaTurno(valor: string | null | undefined): string {
  return TURNOS.find(t => t.valor === valor)?.etiqueta ?? 'Sin turno';
}
