import { estadoStock } from './components/stock-meter/stock-meter.component';
import { aCsv } from './utils/csv';
import { importeLinea, montosRapidos } from '../features/ventas/venta-nueva/venta-nueva.component';

describe('estadoStock', () => {
  it('clasifica según el mínimo configurado', () => {
    expect(estadoStock(0, 10)).toBe('agotado');
    expect(estadoStock(5, 10)).toBe('critico');
    expect(estadoStock(12, 10)).toBe('por-reponer');
    expect(estadoStock(40, 10)).toBe('optimo');
    expect(estadoStock(40, 0)).toBe('sin-minimo');
  });
});

describe('importeLinea', () => {
  it('suma el IGV solo a productos gravados cuyo precio no lo incluye (igual que el backend)', () => {
    expect(importeLinea(10, 2, '10', false)).toBe(23.6);
    expect(importeLinea(10, 2, '10', true)).toBe(20);
    expect(importeLinea(10, 2, '20', false)).toBe(20);
    expect(importeLinea(10, 2, null, null)).toBe(20);
  });
});

describe('montosRapidos', () => {
  it('ofrece el monto exacto y los billetes siguientes', () => {
    expect(montosRapidos(42.5)).toEqual([42.5, 50, 100, 200]);
    expect(montosRapidos(0)).toEqual([]);
  });
});

describe('aCsv', () => {
  it('separa con punto y coma, escapa comillas y neutraliza fórmulas', () => {
    expect(aCsv(['A', 'B'], [['x;y', '=SUMA(1)'], ['dice "hola"', 3]]))
      .toBe('A;B\r\n"x;y";\'=SUMA(1)\r\n"dice ""hola""";3');
  });
});
