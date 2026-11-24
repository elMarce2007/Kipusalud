import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TonoKpi = 'neutral' | 'primary' | 'ok' | 'warn' | 'danger';

/** Tarjeta de indicador (etiqueta en mayúsculas, cifra grande, nota e icono). */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <article class="kpi-card" [class]="tono()">
      <div>
        <p class="kpi-label">{{ etiqueta() }}</p>
        <p class="kpi-value">{{ valor() }}</p>
        @if (nota()) { <p class="kpi-hint">{{ nota() }}</p> }
      </div>
      @if (icono()) { <span class="kpi-icon" aria-hidden="true"><mat-icon>{{ icono() }}</mat-icon></span> }
    </article>
  `,
  styles: `:host { display: block; } :host .kpi-card { height: 100%; box-sizing: border-box; }`
})
export class KpiCardComponent {
  etiqueta = input.required<string>();
  valor = input.required<string | number>();
  nota = input<string | null>(null);
  icono = input<string | null>(null);
  tono = input<TonoKpi>('neutral');
}
