/**
 * Generador mínimo de libros Excel (.xlsx) sin dependencias: texto, números y
 * una fila de cabecera en negrita por hoja. El archivo es un ZIP sin compresión
 * con las partes Open XML indispensables.
 */
export type CeldaXlsx = string | number | null | undefined;

export interface HojaXlsx {
  nombre: string;
  filas: CeldaXlsx[][];
  /** Ancho de columnas en caracteres (opcional). */
  anchos?: number[];
}

const encoder = new TextEncoder();

export function crearXlsx(hojas: HojaXlsx[]): Uint8Array {
  const nombres = nombresUnicos(hojas.map(h => h.nombre));
  const archivos: [string, string][] = [
    ['[Content_Types].xml', contentTypes(hojas.length)],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
      nombres.map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
    }</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${
      hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    }<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', ESTILOS],
    ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, hoja(h)] as [string, string])
  ];
  return zip(archivos.map(([nombre, contenido]) => [nombre, encoder.encode(contenido)]));
}

export function descargarXlsx(nombreArchivo: string, hojas: HojaXlsx[]): void {
  const bytes = crearXlsx(hojas);
  const blob = new Blob([bytes as BlobPart],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Letra de columna de Excel: 0 → A, 26 → AA. */
export function columna(indice: number): string {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;

function contentTypes(hojas: number): string {
  const partes = Array.from({ length: hojas }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${partes}</Types>`;
}

function hoja(h: HojaXlsx): string {
  const cols = h.anchos?.length
    ? `<cols>${h.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const filas = h.filas.map((fila, r) => `<row r="${r + 1}">${fila.map((valor, c) => celda(valor, `${columna(c)}${r + 1}`, r === 0)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${filas}</sheetData></worksheet>`;
}

function celda(valor: CeldaXlsx, ref: string, cabecera: boolean): string {
  const estilo = cabecera ? ' s="1"' : '';
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${estilo}><v>${valor}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escapar(String(valor))}</t></is></c>`;
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
    // Caracteres de control no permitidos en XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Excel limita los nombres de hoja a 31 caracteres sin []:*?/\ y sin repetir. */
function nombresUnicos(nombres: string[]): string[] {
  const usados = new Set<string>();
  return nombres.map((n, i) => {
    let base = (n || `Hoja ${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || `Hoja ${i + 1}`;
    let candidato = base;
    for (let k = 2; usados.has(candidato.toLowerCase()); k++) candidato = `${base.slice(0, 28)} ${k}`;
    usados.add(candidato.toLowerCase());
    return candidato;
  });
}

// ---- ZIP (método "stored", sin compresión) ----

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i++) crc = TABLA_CRC[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entradas: [string, Uint8Array][]): Uint8Array {
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const [nombre, datos] of entradas) {
    const nombreBytes = encoder.encode(nombre);
    const crc = crc32(datos);
    const local = new Uint8Array(30 + nombreBytes.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true);
    vl.setUint16(6, 0x0800, true); // nombres en UTF-8
    vl.setUint16(8, 0, true);
    vl.setUint16(10, 0, true);
    vl.setUint16(12, 0x21, true); // 1980-01-01
    vl.setUint32(14, crc, true);
    vl.setUint32(18, datos.length, true);
    vl.setUint32(22, datos.length, true);
    vl.setUint16(26, nombreBytes.length, true);
    local.set(nombreBytes, 30);

    const central = new Uint8Array(46 + nombreBytes.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true);
    vc.setUint16(6, 20, true);
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(14, 0x21, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, datos.length, true);
    vc.setUint32(24, datos.length, true);
    vc.setUint16(28, nombreBytes.length, true);
    vc.setUint32(42, desplazamiento, true);
    central.set(nombreBytes, 46);

    locales.push(local, datos);
    centrales.push(central);
    desplazamiento += local.length + datos.length;
  }
  const tamanoCentral = centrales.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, entradas.length, true);
  vf.setUint16(10, entradas.length, true);
  vf.setUint32(12, tamanoCentral, true);
  vf.setUint32(16, desplazamiento, true);

  const total = new Uint8Array(desplazamiento + tamanoCentral + fin.length);
  let p = 0;
  for (const parte of [...locales, ...centrales, fin]) {
    total.set(parte, p);
    p += parte.length;
  }
  return total;
}
