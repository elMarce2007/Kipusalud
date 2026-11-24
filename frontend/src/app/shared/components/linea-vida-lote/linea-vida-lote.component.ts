import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MOTIVOS_AJUSTE, MovimientoInventario } from '../../../models/inventario.model';

interface Evento {
  id: number;
  titulo: string;
  detalle: string;
  fecha: string;
  tono: 'ok' | 'warn' | 'danger';
}

/**
 * "Línea de vida del lote" (Kipu Cord) del diseño de Stitch: un cordel vertical con un
 * nudo por movimiento. Verde para ingresos, ocre para ventas y terracota para bajas.
 */
@Component({
  selector: 'app-linea-vida-lote',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (eventos().length) {
      <ol class="cordel">
        @for (e of eventos(); track e.id) {
          <li [class]="e.tono">
            <span class="nudo" aria-hidden="true"></span>
            <div class="cabecera"><strong>{{ e.titulo }}</strong><time>{{ e.fecha | date:'dd/MM/yyyy HH:mm' }}</time></div>
            <p>{{ e.detalle }}</p>
          </li>
        }
      </ol>
    } @else {
      <p class="vacio">Sin movimientos registrados.</p>
    }
  `,
  styles: `
    .cordel { position: relative; list-style: none; margin: 0; padding: 0 0 0 22px; }
    .cordel::before { content: ''; position: absolute; left: 6px; top: 6px; bottom: 6px; width: 2px; background: var(--kipu-line); }
    li { position: relative; padding-bottom: 14px; }
    .nudo { position: absolute; left: -22px; top: 3px; width: 10px; height: 10px; border: 2px solid var(--kipu-ok-fg);
      border-radius: 50%; background: #fff; }
    li.warn .nudo { border-color: var(--kipu-ochre); }
    li.danger .nudo { border-color: var(--kipu-danger-fg); }
    li.danger strong { color: var(--kipu-danger-fg); }
    .cabecera { display: flex; justify-content: space-between; gap: 8px; }
    time { color: var(--kipu-soft); font-size: 12px; white-space: nowrap; }
    p { margin: 2px 0 0; color: var(--kipu-muted); font-size: 13px; }
    .vacio { color: var(--kipu-soft); }
  `
})
export class LineaVidaLoteComponent {
  /** Movimientos del Kardex; se muestran del más reciente al más antiguo. */
  movimientos = input<MovimientoInventario[]>([]);

  eventos = computed<Evento[]>(() => this.movimientos().map(m => {
    const lote = m.codigoLote ? ` · lote ${m.codigoLote}` : '';
    const unidades = Math.abs(m.cantidad);
    switch (m.tipo) {
      case 'INGRESO':
        return { id: m.id, fecha: m.creadoEn, tono: 'ok' as const, titulo: 'Ingreso de mercadería',
          detalle: `+${unidades} un.${lote} · ${m.actor}` };
      case 'VENTA':
        return { id: m.id, fecha: m.creadoEn, tono: 'warn' as const, titulo: 'Dispensación en mostrador',
          detalle: `−${unidades} un.${lote} · ${m.actor}` };
      case 'AJUSTE': {
        const motivo = MOTIVOS_AJUSTE.find(x => x.valor === m.motivo)?.etiqueta ?? m.motivo ?? 'Ajuste';
        return { id: m.id, fecha: m.creadoEn, tono: 'danger' as const, titulo: `Baja: ${motivo}`,
          detalle: `−${unidades} un.${lote} · ${m.actor}${m.observacion ? ' · ' + m.observacion : ''}` };
      }
      default:
        return { id: m.id, fecha: m.creadoEn, tono: 'warn' as const, titulo: m.tipo,
          detalle: `${m.cantidad} un.${lote} · ${m.actor}` };
    }
  }));
}
