/** Nombre legible de cada rol del backend, como aparece en la cabecera. */
export const ETIQUETAS_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_SUPERVISOR: 'Gerente / Supervisor',
  QF_REGENTE: 'Q.F. Regente',
  EMPLEADO: 'Técnico / Cajero'
};

export function etiquetaRol(rol: string | null | undefined): string {
  return rol ? ETIQUETAS_ROL[rol] ?? rol : '';
}
