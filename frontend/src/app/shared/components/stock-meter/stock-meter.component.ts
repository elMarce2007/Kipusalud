import { Component, computed, input } from '@angular/core';

export type EstadoStock = 'optimo' | 'por-reponer' | 'critico' | 'agotado' | 'sin-minimo';

/**
 * Estado del stock respecto del mínimo configurado:
 * agotado (0), crítico (bajo el mínimo), por reponer (hasta 1,5 veces el mínimo) u óptimo.
 */
export function estadoStock(stock: number, minimo: number | null | undefined): EstadoStock {
  if (stock <= 0) return 'agotado';
  const min = minimo ?? 0;
  if (min <= 0) return 'sin-minimo';
  if (stock < min) return 'critico';
  if (stock <= min * 1.5) return 'por-reponer';
  return 'optimo';
}

export const ETIQUETAS_ESTADO_STOCK: Record<EstadoStock, string> = {
  optimo: 'Óptimo',
  'por-reponer': 'Por reponer',
  critico: 'Crítico',
  agotado: 'Agotado',
  'sin-minimo': 'Sin mínimo'
};

/** Clase visual (chip, punto o barra) para cada estado. */
export function tonoEstadoStock(estado: EstadoStock): 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (estado) {
    case 'optimo': return 'ok';
    case 'por-reponer': return 'warn';
    case 'critico':
    case 'agotado': return 'danger';
    default: return 'neutral';
  }
}

/** Cantidad disponible con barra proporcional al mínimo, como en la tabla de Stitch. */
@Component({
  selector: 'app-stock-meter',
  standalone: true,
  template: `
    <div class="stock-meter" [class]="tono()">
      <span class="stock-text">{{ stock() }} {{ unidad() }}
        @if ((minimo() ?? 0) > 0) { <small>/ mín {{ minimo() }}</small> }
      </span>
      <span class="bar" aria-hidden="true"><span [style.width.%]="porcentaje()"></span></span>
    </div>
  `
})
export class StockMeterComponent {
  stock = input.required<number>();
  minimo = input<number | null | undefined>(0);
  unidad = input('un.');

  tono = computed(() => tonoEstadoStock(estadoStock(this.stock(), this.minimo())));
  /** La barra se llena al llegar al doble del mínimo (o a 100 unidades si no hay mínimo). */
  porcentaje = computed(() => {
    const referencia = (this.minimo() ?? 0) > 0 ? this.minimo()! * 2 : 100;
    return Math.max(4, Math.min(100, (this.stock() / referencia) * 100));
  });
}
