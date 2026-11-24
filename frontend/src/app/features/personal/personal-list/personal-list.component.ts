import { Component, OnInit, inject, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PersonalService } from '../../../services/personal.service';
import { Personal, etiquetaTurno } from '../../../models/personal.model';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-personal-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    KpiCardComponent,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="page-container">
      <app-page-header titulo="Gestión de personal" [migas]="[{ etiqueta: 'Personal' }]">
        <button mat-stroked-button (click)="descargarReporte()">
          <mat-icon>download</mat-icon> Exportar
        </button>
        <button mat-raised-button color="primary" routerLink="nuevo">
          <mat-icon>person_add</mat-icon> Nuevo colaborador
        </button>
      </app-page-header>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      <section class="kpi-grid" aria-label="Resumen del personal">
        <app-kpi-card etiqueta="Colaboradores activos" [valor]="activos()" [nota]="total() + ' registrados'"
                      icono="badge" tono="primary" />
        <app-kpi-card etiqueta="Químicos colegiados" [valor]="colegiados()" nota="Con número CQFP registrado"
                      icono="verified" [tono]="colegiados() ? 'ok' : 'warn'" />
        <app-kpi-card etiqueta="Sin turno asignado" [valor]="sinTurno()" nota="Colaboradores activos"
                      icono="schedule" [tono]="sinTurno() ? 'warn' : 'ok'" />
      </section>

      <mat-card>
        <mat-card-content>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Buscar</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Nombre, cargo, DNI o colegiatura…">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="apellidos">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Colaborador</th>
              <td mat-cell *matCellDef="let row">
                <div class="persona">
                  <span class="avatar" aria-hidden="true">{{ iniciales(row) }}</span>
                  <span><strong>{{ row.nombres }} {{ row.apellidos }}</strong>
                    <small>{{ row.email }}@if (row.telefono) { · {{ row.telefono }} }</small></span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="cargo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Cargo</th>
              <td mat-cell *matCellDef="let row">
                {{ row.cargo }}
                @if (row.colegiatura) { <small class="mono">CQFP {{ row.colegiatura }}</small> }
              </td>
            </ng-container>

            <ng-container matColumnDef="dni">
              <th mat-header-cell *matHeaderCellDef>DNI</th>
              <td mat-cell *matCellDef="let row"><span class="mono">{{ row.dni || '—' }}</span></td>
            </ng-container>

            <ng-container matColumnDef="turno">
              <th mat-header-cell *matHeaderCellDef>Turno</th>
              <td mat-cell *matCellDef="let row">{{ turno(row.turno) }}</td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">
                <span class="chip" [class.ok]="row.activo !== false">{{ row.activo !== false ? 'Activo' : 'Inactivo' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button color="primary" [routerLink]="['editar', row.id]" aria-label="Editar colaborador">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminar(row)" aria-label="Eliminar colaborador">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" colspan="6" style="text-align: center; padding: 20px;">
                No se encontraron resultados
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .kpi-grid { margin-bottom: 20px; }
    .persona { display: flex; align-items: center; gap: 10px; }
    .avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
      background: var(--kipu-primary-container); color: #fff; font-weight: 700; font-size: 13px; flex: none; }
    td small { display: block; color: var(--kipu-soft); font-size: 12px; }
    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-excel {
      background-color: #41664f;
      color: #ffffff;
    }

    .btn-excel:hover {
      background-color: #294e38;
    }
  `
})
export class PersonalListComponent implements OnInit, AfterViewInit {
  private personalService = inject(PersonalService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loadError = signal<string | null>(null);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['apellidos', 'cargo', 'dni', 'turno', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Personal>();
  private personal = signal<Personal[]>([]);
  total = computed(() => this.personal().length);
  activos = computed(() => this.personal().filter(p => p.activo !== false).length);
  colegiados = computed(() => this.personal().filter(p => p.activo !== false && !!p.colegiatura).length);
  sinTurno = computed(() => this.personal().filter(p => p.activo !== false && !p.turno).length);
  turno = etiquetaTurno;

  iniciales(p: Personal): string {
    return `${p.nombres?.[0] ?? ''}${p.apellidos?.[0] ?? ''}`.toUpperCase();
  }

  constructor() {
    this.dataSource.filterPredicate = (p, filtro) =>
      [p.nombres, p.apellidos, p.cargo, p.email, p.dni, p.colegiatura]
        .some(v => !!v && v.toLowerCase().includes(filtro));
  }

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargarDatos() {
    this.loadError.set(null);
    this.personalService.listar().subscribe({
      next: data => { this.dataSource.data = data; this.personal.set(data); },
      error: err => {
        console.error('No se pudo cargar la lista de personal.', err);
        this.loadError.set('No se pudo cargar el personal de esta farmacia.');
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  descargarReporte() {
    this.personalService.descargarReporte().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `personal_${new Date().toISOString().slice(0, 10)}.csv`;
        enlace.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Reporte descargado', 'OK', { duration: 3000 });
      },
      error: err => {
        console.error('No se pudo generar el reporte de personal.', err);
        this.snackBar.open('No se pudo generar el reporte.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  eliminar(personal: Personal) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Personal',
        message: `Esta seguro de eliminar a ${personal.nombres} ${personal.apellidos}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && personal.id) {
        this.personalService.eliminar(personal.id).subscribe({
          next: () => {
            this.snackBar.open('Personal eliminado', 'OK', { duration: 3000 });
            this.cargarDatos();
          },
          error: err => {
            console.error('No se pudo eliminar el registro de personal.', err);
            this.snackBar.open('No se pudo eliminar el registro de personal.', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}