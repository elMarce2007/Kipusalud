import { Personal, TURNOS, Turno } from '../../../models/personal.model';

export interface ColumnaTurno {
  turno: Turno | null;
  etiqueta: string;
  personas: Personal[];
  /** Mañana, tarde y noche deben contar con un químico farmacéutico colegiado. */
  requiereQf: boolean;
  tieneQf: boolean;
}

const TURNOS_DE_ATENCION: Turno[] = ['MANANA', 'TARDE', 'NOCHE'];

/** Agrupa al personal activo por turno; la columna "Sin turno" solo aparece si hay alguien sin asignar. */
export function columnasDeTurnos(activos: Personal[]): ColumnaTurno[] {
  const ordenar = (a: Personal, b: Personal) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`);
  const columnas: ColumnaTurno[] = TURNOS.map(t => {
    const personas = activos.filter(p => p.turno === t.valor).sort(ordenar);
    return {
      turno: t.valor,
      etiqueta: t.etiqueta,
      personas,
      requiereQf: TURNOS_DE_ATENCION.includes(t.valor),
      tieneQf: personas.some(p => !!p.colegiatura)
    };
  });
  const sinTurno = activos.filter(p => !p.turno).sort(ordenar);
  if (sinTurno.length) {
    columnas.push({ turno: null, etiqueta: 'Sin turno', personas: sinTurno, requiereQf: false, tieneQf: false });
  }
  return columnas;
}
