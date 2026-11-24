/** Requisitos de contraseña mostrados al usuario; el servidor exige entre 12 y 72 caracteres. */
export interface RequisitosPassword {
  largo: boolean;
  digito: boolean;
  simbolo: boolean;
}

export function requisitosPassword(password: string): RequisitosPassword {
  return {
    largo: password.length >= 12 && password.length <= 72,
    digito: /\d/.test(password),
    simbolo: /[^A-Za-z0-9]/.test(password)
  };
}

/** 0 a 3 según los requisitos que cumple. */
export function fortalezaPassword(password: string): number {
  if (!password) return 0;
  const r = requisitosPassword(password);
  return Number(r.largo) + Number(r.digito) + Number(r.simbolo);
}

export const ETIQUETAS_FORTALEZA = ['Pendiente de ingreso', 'Débil', 'Aceptable', 'Fuerte'];
