import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Miga {
  etiqueta: string;
  ruta?: string;
}

/**
 * Encabezado de página al estilo Stitch: ruta de navegación, título, insignia opcional
 * y acciones a la derecha (proyectadas con `<ng-content>`).
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div>
        @if (migas().length) {
          <ol class="breadcrumb" aria-label="Ruta de navegación">
            <li><a routerLink="/dashboard">Panel general</a></li>
            @for (miga of migas(); track miga.etiqueta) {
              <li>
                @if (miga.ruta) { <a [routerLink]="miga.ruta">{{ miga.etiqueta }}</a> } @else { {{ miga.etiqueta }} }
              </li>
            }
          </ol>
        }
        <div class="titulo">
          <h1>{{ titulo() }}</h1>
          @if (insignia()) { <span class="chip ok">{{ insignia() }}</span> }
        </div>
        @if (descripcion()) { <p class="descripcion">{{ descripcion() }}</p> }
      </div>
      <div class="header-actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .titulo { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .descripcion { margin: 6px 0 0; color: var(--kipu-soft); max-width: 720px; }
  `
})
export class PageHeaderComponent {
  titulo = input.required<string>();
  migas = input<Miga[]>([]);
  insignia = input<string | null>(null);
  descripcion = input<string | null>(null);
}
