import { EmisorComprobante } from '../../../models/facturacion.model';
import { DetalleVenta, TIPOS_COMPROBANTE, Venta } from '../../../models/venta.model';

const IGV = 0.18;

export interface TotalesComprobante {
  gravada: number;
  exonerada: number;
  inafecta: number;
  /** Líneas sin afectación IGV configurada (solo posibles en boleta interna). */
  sinDetalle: number;
  igv: number;
  total: number;
}

const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Desglose tributario a partir de los subtotales cobrados (que ya incluyen el IGV de las
 * operaciones gravadas), igual que el backend al generar el XML.
 */
export function calcularTotales(detalles: DetalleVenta[]): TotalesComprobante {
  const totales: TotalesComprobante = { gravada: 0, exonerada: 0, inafecta: 0, sinDetalle: 0, igv: 0, total: 0 };
  for (const linea of detalles) {
    const importe = Number(linea.subtotal ?? 0);
    totales.total += importe;
    switch (linea.afectacionIgv) {
      case '10': {
        const base = redondear(importe / (1 + IGV));
        totales.gravada += base;
        totales.igv += redondear(importe - base);
        break;
      }
      case '20': totales.exonerada += importe; break;
      case '30': totales.inafecta += importe; break;
      default: totales.sinDetalle += importe;
    }
  }
  (Object.keys(totales) as (keyof TotalesComprobante)[]).forEach(k => totales[k] = redondear(totales[k]));
  return totales;
}

const escapar = (texto: unknown) => String(texto ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const soles = (valor: number) => `S/ ${valor.toFixed(2)}`;

export interface DatosImpresion {
  venta: Venta;
  emisor: EmisorComprobante | null;
  nombreFarmacia: string;
  cliente: { nombre: string; documento: string } | null;
  nombresProducto: Partial<Record<number, string>>;
  estadoSunat: string | null;
}

/** HTML autónomo del comprobante, pensado para un ticket o una hoja A4. */
export function htmlComprobante(d: DatosImpresion): string {
  const v = d.venta;
  const tipo = v.tipoComprobante ?? 'BOLETA_INTERNA';
  const titulo = tipo === 'FACTURA' ? 'FACTURA ELECTRÓNICA'
    : tipo === 'BOLETA_ELECTRONICA' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'BOLETA DE VENTA';
  const numero = v.serieComprobante && v.numeroComprobante
    ? `${v.serieComprobante}-${v.numeroComprobante}` : `Venta #${v.id}`;
  const totales = calcularTotales(v.detalles);
  const lineas = v.detalles.map(l => `
      <tr>
        <td>${escapar(l.cantidad)}</td>
        <td>${escapar(l.nombreProducto ?? d.nombresProducto[l.productoId] ?? `Producto #${l.productoId}`)}</td>
        <td class="num">${soles(Number(l.precioUnitario))}</td>
        <td class="num">${soles(Number(l.subtotal))}</td>
      </tr>`).join('');
  const filaTotal = (etiqueta: string, valor: number) => valor
    ? `<tr><td>${etiqueta}</td><td class="num">${soles(valor)}</td></tr>` : '';
  const emisor = d.emisor
    ? `<strong>${escapar(d.emisor.razonSocial)}</strong><br>RUC ${escapar(d.emisor.ruc)}<br>
       ${escapar(d.emisor.direccionFiscal)}
       ${d.emisor.telefono ? `<br>Tel. ${escapar(d.emisor.telefono)}` : ''}`
    : `<strong>${escapar(d.nombreFarmacia)}</strong>`;
  const fecha = new Date(v.fecha).toLocaleString('es-PE');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${escapar(titulo)} ${escapar(numero)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; max-width: 380px; margin: 0 auto; padding: 12px; }
  .centro { text-align: center; }
  .caja { border: 1px solid #000; padding: 6px; margin: 8px 0; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 3px 2px; vertical-align: top; text-align: left; }
  thead th { border-bottom: 1px solid #000; }
  .num { text-align: right; white-space: nowrap; }
  .totales td { padding: 2px; }
  .total td { font-weight: bold; border-top: 1px solid #000; }
  .pie { margin-top: 12px; font-size: 11px; text-align: center; }
  @page { margin: 8mm; }
</style></head><body>
  <div class="centro">${emisor}</div>
  <div class="caja"><strong>${escapar(titulo)}</strong><br>${escapar(numero)}</div>
  <p>Fecha: ${escapar(fecha)}<br>
     Cliente: ${escapar(d.cliente?.nombre ?? 'Público general')}
     ${d.cliente?.documento ? `<br>${escapar(d.cliente.documento)}` : ''}</p>
  <table>
    <thead><tr><th>Cant.</th><th>Descripción</th><th class="num">P. unit.</th><th class="num">Importe</th></tr></thead>
    <tbody>${lineas}</tbody>
  </table>
  <table class="totales">
    ${filaTotal('Op. gravada', totales.gravada)}
    ${filaTotal('Op. exonerada', totales.exonerada)}
    ${filaTotal('Op. inafecta', totales.inafecta)}
    ${filaTotal('IGV (18%)', totales.igv)}
    <tr class="total"><td>TOTAL</td><td class="num">${soles(Number(v.total))}</td></tr>
  </table>
  ${v.registradoPor ? `<p>Atendido por: ${escapar(v.registradoPor)}</p>` : ''}
  <p>Pago: ${escapar(v.metodoPago ?? '')}
    ${v.metodoPago === 'EFECTIVO'
      ? ` · Recibido ${soles(Number(v.montoRecibido ?? 0))} · Vuelto ${soles(Number(v.vuelto ?? 0))}` : ''}</p>
  <div class="pie">
    ${tipo === 'BOLETA_INTERNA'
      ? 'Comprobante interno de la farmacia.'
      : `Representación impresa del comprobante electrónico.${d.estadoSunat ? ` Estado SUNAT: ${escapar(d.estadoSunat)}.` : ''}`}
    <br>${escapar(TIPOS_COMPROBANTE[tipo])} emitida con KipuSalud.
  </div>
</body></html>`;
}

/** Imprime el HTML en un iframe oculto para no abrir ventanas emergentes. */
export function imprimirHtml(html: string): void {
  const marco = document.createElement('iframe');
  marco.setAttribute('aria-hidden', 'true');
  marco.style.position = 'fixed';
  marco.style.width = '0';
  marco.style.height = '0';
  marco.style.border = '0';
  document.body.appendChild(marco);
  const doc = marco.contentDocument;
  if (!doc || !marco.contentWindow) {
    marco.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  marco.contentWindow.focus();
  marco.contentWindow.print();
  setTimeout(() => marco.remove(), 1000);
}
