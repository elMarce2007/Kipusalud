import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { PersonalService } from '../../../services/personal.service';
import { AuthService } from '../../../services/auth.service';
import { HORARIO_TURNO, Personal, TURNOS, Turno } from '../../../models/personal.model';
import { columnasDeTurnos } from './turnos.util';

/**
 * Turnos del personal: quién cubre cada horario y si hay un químico farmacéutico
 * colegiado (CQFP) en cada turno de atención, como exige DIGEMID.
 */
@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, KpiCardComponent],
  template: `
    <div class="page-container">
      <app-page-header titulo="Turnos del personal"
                       descripcion="Cobertura de cada turno y presencia de un químico farmacéutico colegiado."
                       [migas]="[{ etiqueta: 'Personal', ruta: '/personal' }, { etiqueta: 'Turnos' }]">
        @if (puedeVerVentas) {
          <a mat-stroked-button routerLink="/reportes" [queryParams]="{ tipo: 'turnos' }">
            <mat-icon>monitoring</mat-icon> Ventas por turno
          </a>
        }
        <a mat-raised-button color="primary" routerLink="/personal/nuevo">
          <mat-icon>person_add</mat-icon> Nuevo colaborador
        </a>
      </app-page-header>

      @if (error()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
          <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
        </div>
      }

      <section class="kpi-grid">
        <app-kpi-card etiqueta="Colaboradores activos" [valor]="activos().length" icono="badge" tono="primary"
                      [nota]="inactivos() + ' inactivos no se muestran'" />
        <app-kpi-card etiqueta="Turnos con Q.F." [valor]="turnosCubiertos() + ' de 3'"
                      nota="Mañana, tarde y noche" icono="verified" [tono]="turnosCubiertos() === 3 ? 'ok' : 'warn'" />
        <app-kpi-card etiqueta="Sin turno asignado" [valor]="sinTurno().length" nota="Asígnalos a un horario"
                      icono="schedule" [tono]="sinTurno().length ? 'warn' : 'ok'" />
      </section>

      <section class="tablero" aria-label="Turnos">
        @for (col of columnas(); track col.turno) {
          <article class="columna" [class.alerta]="col.requiereQf && !col.tieneQf">
            <header>
              <div><h2>{{ col.etiqueta }}</h2><small>{{ horario(col.turno) }}</small></div>
              <span class="conteo">{{ col.personas.length }}</span>
            </header>
            @if (col.requiereQf) {
              @if (col.tieneQf) {
                <p class="cobertura ok"><mat-icon>verified</mat-icon> Q.F. colegiado presente</p>
              } @else {
                <p class="cobertura warn"><mat-icon>warning</mat-icon> Sin químico farmacéutico colegiado</p>
              }
            }
            <ul>
              @for (p of col.personas; track p.id) {
                <li>
                  <span class="avatar" aria-hidden="true">{{ iniciales(p) }}</span>
                  <div class="datos">
                    <strong>{{ p.nombres }} {{ p.apellidos }}</strong>
                    <small>{{ p.cargo }}@if (p.colegiatura) { · CQFP {{ p.colegiatura }} }</small>
                    @if (puedeGestionar) {
                      <select [attr.aria-label]="'Turno de ' + p.nombres"
                              [disabled]="guardandoId() === p.id" (change)="moverA(p, $any($event.target).value)">
                        <option value="" [selected]="!p.turno">Sin turno</option>
                        @for (t of turnos; track t.valor) {
                          <option [value]="t.valor" [selected]="p.turno === t.valor">{{ t.etiqueta }}</option>
                        }
                      </select>
                    }
                  </div>
                </li>
              } @empty {
                <li class="vacio">Nadie asignado.</li>
              }
            </ul>
          </article>
        }
      </section>
    </div>
  `,
  styles: `
    .kpi-grid { margin-bottom: 20px; }
    .tablero { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: start; }
    .columna { padding: 14px 16px; border: 1px solid var(--kipu-line); border-top: 3px solid var(--kipu-ok-fg);
      border-radius: var(--kipu-radius); background: #fff; }
    .columna.alerta { border-top-color: var(--kipu-ochre); }
    .columna header { display: flex; justify-content: space-between; align-items: flex-start; }
    h2 { margin: 0; font-size: 17px; }
    header small { color: var(--kipu-soft); font-size: 12px; }
    .conteo { display: grid; place-items: center; min-width: 28px; height: 28px; border-radius: 14px;
      background: var(--kipu-surface-high); font-weight: 700; }
    .cobertura { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: 12px; font-weight: 600; }
    .cobertura mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .cobertura.ok { color: var(--kipu-ok-fg); }
    .cobertura.warn { color: var(--kipu-warn-fg); }
    ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
    li { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: var(--kipu-radius-sm);
      background: var(--kipu-surface-high); }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex: none;
      background: var(--kipu-primary-container); color: #fff; font-size: 12px; font-weight: 700; }
    .datos { display: grid; gap: 2px; min-width: 0; }
    .datos small { color: var(--kipu-soft); font-size: 12px; }
    select { margin-top: 4px; height: 28px; border: 1px solid var(--kipu-line); border-radius: 6px; background: #fff; }
    li.vacio { display: block; color: var(--kipu-soft); background: transparent; text-align: center; }
  `
})
export class TurnosComponent implements OnInit {
  private personalService = inject(PersonalService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  readonly turnos = TURNOS;
  readonly puedeGestionar = this.authService.hasPermission('PERSONAL:GESTIONAR');
  readonly puedeVerVentas = this.authService.hasPermission('VENTAS:VER');
  personal = signal<Personal[]>([]);
  error = signal<string | null>(null);
  guardandoId = signal<number | null>(null);

  activos = computed(() => this.personal().filter(p => p.activo !== false));
  inactivos = computed(() => this.personal().length - this.activos().length);
  sinTurno = computed(() => this.activos().filter(p => !p.turno));
  columnas = computed(() => columnasDeTurnos(this.activos()));
  turnosCubiertos = computed(() => this.columnas().filter(c => c.requiereQf && c.tieneQf).length);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.error.set(null);
    this.personalService.listar().subscribe({
      next: data => this.personal.set(data),
      error: err => {
        console.error('No se pudo cargar el personal.', err);
        this.error.set('No se pudo cargar el personal de esta farmacia.');
      }
    });
  }

  moverA(p: Personal, turno: string) {
    if (!p.id) return;
    const nuevo = (turno || null) as Turno | null;
    this.guardandoId.set(p.id);
    this.personalService.actualizar(p.id, { ...p, turno: nuevo }).subscribe({
      next: actualizado => {
        this.personal.update(lista => lista.map(x => x.id === p.id ? { ...x, ...actualizado, turno: nuevo } : x));
        this.guardandoId.set(null);
        this.snackBar.open(`${p.nombres} pasó a ${nuevo ? this.etiqueta(nuevo) : 'sin turno'}.`, 'OK', { duration: 2500 });
      },
      error: () => {
        this.guardandoId.set(null);
        this.personal.update(lista => [...lista]);
      }
    });
  }

  horario(turno: Turno | null) { return turno ? HORARIO_TURNO[turno] : 'Pendiente de asignar'; }
  iniciales(p: Personal) { return `${p.nombres?.[0] ?? ''}${p.apellidos?.[0] ?? ''}`.toUpperCase(); }
  private etiqueta(t: Turno) { return TURNOS.find(x => x.valor === t)?.etiqueta ?? t; }
}
