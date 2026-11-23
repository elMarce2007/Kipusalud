import { Venta } from '../../../models/venta.model';
import { clienteFacturable } from '../venta-nueva/venta-nueva.component';
import { calcularTotales, htmlComprobante } from './comprobante-impreso';

describe('comprobante de pago', () => {
  it('separa base e IGV de líneas gravadas y suma exoneradas aparte', () => {
    const totales = calcularTotales([
      { productoId: 1, cantidad: 1, precioUnitario: 11.8, subtotal: 11.8, afectacionIgv: '10' },
      { productoId: 2, cantidad: 2, precioUnitario: 5, subtotal: 10, afectacionIgv: '20' }
    ]);

    expect(totales.gravada).toBe(10);
    expect(totales.igv).toBe(1.8);
    expect(totales.exonerada).toBe(10);
    expect(totales.total).toBe(21.8);
  });

  it('solo considera facturable a un cliente con RUC, razón social y dirección fiscal', () => {
    const base = { nombres: 'Ana', apellidos: 'Demo', dni: '12345678', telefono: '9', email: 'a@x.invalid' };
    expect(clienteFacturable({ ...base, ruc: '20100000001', razonSocial: 'Clínica SAC', direccionFiscal: 'Av. 1' }))
      .toBe(true);
    expect(clienteFacturable({ ...base, ruc: '20100000001', razonSocial: 'Clínica SAC', direccionFiscal: '' }))
      .toBe(false);
    expect(clienteFacturable({ ...base, ruc: '123' })).toBe(false);
    expect(clienteFacturable(null)).toBe(false);
  });

  it('imprime una boleta interna con su numeración y escapa el texto', () => {
    const venta: Venta = {
      id: 9,
      fecha: '2026-11-23T10:00:00',
      clienteId: null,
      total: 5,
      metodoPago: 'EFECTIVO',
      montoRecibido: 10,
      vuelto: 5,
      tipoComprobante: 'BOLETA_INTERNA',
      serieComprobante: 'I001',
      numeroComprobante: '00000007',
      detalles: [{ productoId: 1, cantidad: 1, precioUnitario: 5, subtotal: 5, nombreProducto: '<script>x</script>' }]
    };

    const html = htmlComprobante({
      venta, emisor: null, nombreFarmacia: 'Botica Demo', cliente: null, nombresProducto: {}, estadoSunat: null
    });

    expect(html).toContain('BOLETA DE VENTA');
    expect(html).toContain('I001-00000007');
    expect(html).toContain('Público general');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
