import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ETIQUETAS_FORTALEZA, fortalezaPassword, requisitosPassword } from '../../../core/utils/password';

/** Barra de fortaleza y lista de requisitos de una contraseña nueva. */
@Component({
  selector: 'app-fortaleza-password',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="fortaleza" [attr.data-nivel]="nivel()">
      <div class="cabecera">
        <span>Nivel de fortaleza</span>
        <strong>{{ etiqueta() }}</strong>
      </div>
      <div class="barras" aria-hidden="true"><i></i><i></i><i></i></div>
      <ul>
        <li [class.ok]="requisitos().largo">
          <mat-icon>{{ requisitos().largo ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> 12 caracteres o más
        </li>
        <li [class.ok]="requisitos().digito">
          <mat-icon>{{ requisitos().digito ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> Un dígito (0-9)
        </li>
        <li [class.ok]="requisitos().simbolo">
          <mat-icon>{{ requisitos().simbolo ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> Un símbolo (&#64;$!#)
        </li>
      </ul>
    </div>
  `,
  styles: `
    .fortaleza { padding: 12px 14px; border-radius: var(--kipu-radius-sm); background: var(--kipu-surface-high); margin-bottom: 16px; }
    .cabecera { display: flex; justify-content: space-between; font-size: 13px; color: var(--kipu-muted); }
    .cabecera strong { color: var(--kipu-warn-fg); }
    [data-nivel="3"] .cabecera strong { color: var(--kipu-ok-fg); }
    .barras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 8px 0; }
    .barras i { height: 4px; border-radius: 2px; background: var(--kipu-line); }
    [data-nivel="1"] .barras i:nth-child(-n+1),
    [data-nivel="2"] .barras i:nth-child(-n+2) { background: var(--kipu-ochre); }
    [data-nivel="3"] .barras i { background: var(--kipu-ok-fg); }
    ul { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--kipu-soft); }
    li { display: inline-flex; align-items: center; gap: 4px; }
    li mat-icon { width: 16px; height: 16px; font-size: 16px; }
    li.ok { color: var(--kipu-ok-fg); }
  `
})
export class FortalezaPasswordComponent {
  password = input('');
  requisitos = computed(() => requisitosPassword(this.password()));
  nivel = computed(() => fortalezaPassword(this.password()));
  etiqueta = computed(() => ETIQUETAS_FORTALEZA[this.nivel()]);
}
