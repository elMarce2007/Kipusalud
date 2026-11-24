import { columna, crc32, crearXlsx } from './utils/xlsx';
import { fortalezaPassword, requisitosPassword } from '../core/utils/password';
import { participacion, rangoDelMes } from '../models/reporte.model';
import { columnasDeTurnos } from '../features/personal/turnos/turnos.util';
import { Personal } from '../models/personal.model';

describe('Fase E: reportes, contraseñas y turnos', () => {
  it('genera un ZIP válido con CRC32 estándar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const bytes = crearXlsx([{ nombre: 'Kardex', filas: [['A', 'B'], [1, 'x & <y>']] }]);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const texto = new TextDecoder().decode(bytes);
    expect(texto).toContain('x &amp; &lt;y&gt;');
    expect(texto).toContain('<v>1</v>');
  });

  it('nombra columnas como Excel', () => {
    expect(columna(0)).toBe('A');
    expect(columna(25)).toBe('Z');
    expect(columna(26)).toBe('AA');
    expect(columna(701)).toBe('ZZ');
  });

  it('evalúa la fortaleza de la contraseña', () => {
    expect(requisitosPassword('corta').largo).toBe(false);
    expect(fortalezaPassword('')).toBe(0);
    expect(fortalezaPassword('solo-letras-largas')).toBe(2);
    expect(fortalezaPassword('Clave-Segura-2026')).toBe(3);
  });

  it('calcula el período por defecto y la participación', () => {
    expect(rangoDelMes(new Date(2026, 10, 24))).toEqual({ desde: '2026-11-01', hasta: '2026-11-24' });
    expect(participacion(25, 100)).toBe(25);
    expect(participacion(5, 0)).toBe(0);
  });

  it('agrupa el personal por turno y detecta turnos sin Q.F. colegiado', () => {
    const p = (id: number, turno: Personal['turno'], colegiatura: string | null = null): Personal =>
      ({ id, nombres: 'N' + id, apellidos: 'A' + id, cargo: 'Cargo', email: '', turno, colegiatura });
    const columnas = columnasDeTurnos([p(1, 'MANANA', '04567'), p(2, 'TARDE'), p(3, null)]);

    expect(columnas.map(c => c.etiqueta)).toEqual(['Mañana', 'Tarde', 'Noche', 'Rotativo', 'Sin turno']);
    expect(columnas[0].tieneQf).toBe(true);
    expect(columnas[1].requiereQf && !columnas[1].tieneQf).toBe(true);
    expect(columnas[3].requiereQf).toBe(false);
  });
});
