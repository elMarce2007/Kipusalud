import { Producto, coincideProducto, resumenFicha } from '../models/producto.model';
import { condicionDeVenta } from '../models/categoria.model';
import { etiquetaTurno } from '../models/personal.model';

const paracetamol: Producto = {
  id: 1, nombre: 'Panadol', descripcion: 'Analgésico', precio: 5, stock: 10, categoriaId: 1,
  principioActivo: 'Paracetamol', laboratorio: 'GSK', presentacion: 'Caja x 100 tab 500 mg',
  codigoBarras: '7751234567890'
};

describe('Fase D: datos maestros', () => {
  it('busca productos por principio activo, laboratorio y código de barras exacto', () => {
    expect(coincideProducto(paracetamol, 'paracet')).toBe(true);
    expect(coincideProducto(paracetamol, 'gsk')).toBe(true);
    expect(coincideProducto(paracetamol, '7751234567890')).toBe(true);
    expect(coincideProducto(paracetamol, '77512')).toBe(false);
    expect(coincideProducto(paracetamol, 'ibuprofeno')).toBe(false);
  });

  it('resume la ficha con los datos disponibles', () => {
    expect(resumenFicha(paracetamol)).toBe('Paracetamol · Caja x 100 tab 500 mg');
    expect(resumenFicha(paracetamol, true)).toBe('Paracetamol · Caja x 100 tab 500 mg · GSK');
    expect(resumenFicha({ ...paracetamol, principioActivo: null, presentacion: null })).toBe('');
  });

  it('traduce la condición de venta y el turno', () => {
    expect(condicionDeVenta('RECETA_RETENIDA').tono).toBe('danger');
    expect(condicionDeVenta(null).valor).toBe('VENTA_LIBRE');
    expect(etiquetaTurno('MANANA')).toBe('Mañana');
    expect(etiquetaTurno(null)).toBe('Sin turno');
  });
});
