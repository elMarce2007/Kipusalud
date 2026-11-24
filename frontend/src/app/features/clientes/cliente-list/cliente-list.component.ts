import { Component, OnInit, inject, ViewChild, AfterViewInit, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ClienteService } from '../../../services/cliente.service';
import { Cliente, clienteFacturable } from '../../../models/cliente.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { ClienteClinicalDialogComponent } from '../cliente-clinical-dialog.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { descargarCsv } from '../../../shared/utils/csv';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    PageHeaderComponent,
    KpiCardComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header titulo="Directorio de clientes" [migas]="[{ etiqueta: 'Clientes' }]"
                       descripcion="Los datos clínicos se guardan aparte de la ficha de contacto y solo los consultan usuarios autorizados.">
        <button mat-stroked-button type="button" (click)="exportar()" [disabled]="!filtrados().length">
          <mat-icon>download</mat-icon> Exportar
        </button>
        <button mat-raised-button color="primary" routerLink="nuevo">
          <mat-icon>person_add</mat-icon> Nuevo cliente
        </button>
      </app-page-header>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      <section class="kpi-grid" aria-label="Resumen de clientes">
        <app-kpi-card etiqueta="Clientes registrados" [valor]="clientes().length" icono="groups" tono="primary"
                      nota="En el directorio de la farmacia" />
        <app-kpi-card etiqueta="Con datos para factura" [valor]="facturables()" icono="business" tono="ok"
                      nota="RUC, razón social y dirección" />
        <app-kpi-card etiqueta="Con teléfono" [valor]="conTelefono()" icono="call"
                      nota="Contactables para recordatorios" />
      </section>

      <div class="filter-bar" role="search">
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por DNI, RUC, nombres, apellidos o teléfono…" aria-label="Buscar cliente"
                 [value]="texto()" (input)="texto.set($any($event.target).value)">
        </label>
        <select aria-label="Tipo de cliente" [value]="tipo()" (change)="tipo.set($any($event.target).value)">
          <option value="">Todos los clientes</option>
          <option value="empresa">Con datos para factura</option>
          <option value="persona">Solo persona natural</option>
        </select>
        <span class="filter-count">Mostrando {{ filtrados().length }} de {{ clientes().length }}</span>
      </div>

      <mat-card class="ledger-card">
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" matSort class="full-width">
              <ng-container matColumnDef="documento">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="dni">Identificación</th>
                <td mat-cell *matCellDef="let row">
                  <span class="mono">{{ row.dni }}</span>
                  <small class="sub">DNI</small>
                </td>
              </ng-container>

              <ng-container matColumnDef="nombres">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="apellidos">Cliente / contacto</th>
                <td mat-cell *matCellDef="let row">
                  <div class="cell-title">
                    <span>
                      <strong>{{ row.nombres }} {{ row.apellidos }}</strong>
                      <small>{{ row.telefono || 'Sin teléfono' }} · {{ row.email || 'Sin correo' }}</small>
                    </span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="factura">
                <th mat-header-cell *matHeaderCellDef>Datos para factura</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.ruc) {
                    <div class="cell-title"><span>
                      <strong>{{ row.razonSocial || '—' }}</strong>
                      <small class="mono">RUC {{ row.ruc }}</small>
                    </span></div>
                  } @else {
                    <span class="chip">Persona natural</span>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button aria-label="Dispensar ahora: iniciar una venta para este cliente"
                          [routerLink]="['/ventas/nueva']" [queryParams]="{ clienteId: row.id }">
                    <mat-icon>point_of_sale</mat-icon>
                  </button>
                  @if (canViewClinicalData()) {
                    <button mat-icon-button aria-label="Abrir ficha clínica" (click)="abrirFichaClinica(row)">
                      <mat-icon>medical_information</mat-icon>
                    </button>
                  }
                  <button mat-icon-button [routerLink]="['editar', row.id]" aria-label="Editar cliente">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminar(row)" aria-label="Eliminar cliente">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" colspan="4" style="text-align: center; padding: 20px;">
                  No se encontraron clientes con esos filtros
                </td>
              </tr>
            </table>
          </div>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `.sub { display: block; color: var(--kipu-soft); font-size: 11px; }`
})
export class ClienteListComponent implements OnInit, AfterViewInit {
  private clienteService = inject(ClienteService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loadError = signal<string | null>(null);
  canViewClinicalData = signal(['ADMINISTRADOR', 'QF_REGENTE'].includes(this.authService.userRole()));

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['documento', 'nombres', 'factura', 'acciones'];
  dataSource = new MatTableDataSource<Cliente>();

  clientes = signal<Cliente[]>([]);
  texto = signal('');
  tipo = signal('');
  facturables = computed(() => this.clientes().filter(c => clienteFacturable(c)).length);
  conTelefono = computed(() => this.clientes().filter(c => !!c.telefono?.trim()).length);

  filtrados = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    const tipo = this.tipo();
    return this.clientes().filter(c => {
      const campos = [c.dni, c.ruc, c.nombres, c.apellidos, c.telefono, c.razonSocial, c.email]
        .map(v => (v ?? '').toLowerCase()).join(' ');
      const facturable = clienteFacturable(c);
      return (!texto || campos.includes(texto))
        && (!tipo || (tipo === 'empresa' ? facturable : !facturable));
    });
  });

  constructor() {
    effect(() => { this.dataSource.data = this.filtrados(); });
  }

  exportar() {
    descargarCsv('clientes.csv',
      ['Nombres', 'Apellidos', 'DNI', 'Teléfono', 'Correo', 'RUC', 'Razón social', 'Dirección fiscal'],
      this.filtrados().map(c => [c.nombres, c.apellidos, c.dni, c.telefono, c.email,
        c.ruc ?? '', c.razonSocial ?? '', c.direccionFiscal ?? '']));
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
    this.clienteService.listar().subscribe({
      next: data => this.clientes.set(data),
      error: err => {
        console.error('No se pudo cargar la lista de clientes.', err);
        this.loadError.set('No se pudo cargar la lista de clientes. Verifica tu conexión e inténtalo de nuevo.');
      }
    });
  }

  abrirFichaClinica(cliente: Cliente) {
    this.dialog.open(ClienteClinicalDialogComponent, {
      data: cliente,
      width: '600px',
      maxWidth: '94vw'
    });
  }

  eliminar(cliente: Cliente) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Cliente',
        message: `Esta seguro de eliminar a ${cliente.nombres} ${cliente.apellidos}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && cliente.id) {
        this.clienteService.eliminar(cliente.id).subscribe({
          next: () => {
            this.snackBar.open('Cliente eliminado', 'OK', { duration: 3000 });
            this.cargarDatos();
          },
          error: err => {
            console.error('No se pudo eliminar el cliente.', err);
            this.snackBar.open('No se pudo eliminar el cliente.', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}
