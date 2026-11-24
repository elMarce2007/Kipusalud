/**
 * Descarga un CSV compatible con Excel (BOM UTF-8 y separador ";", habitual en Perú).
 * Las celdas que empiezan con = + - @ se prefijan con ' para evitar fórmulas inyectadas.
 */
export function aCsv(encabezados: string[], filas: unknown[][]): string {
  const celda = (valor: unknown) => {
    let texto = valor == null ? '' : String(valor);
    if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  return [encabezados, ...filas].map(fila => fila.map(celda).join(';')).join('\r\n');
}

export function descargarCsv(nombreArchivo: string, encabezados: string[], filas: unknown[][]): void {
  const blob = new Blob(['﻿' + aCsv(encabezados, filas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
