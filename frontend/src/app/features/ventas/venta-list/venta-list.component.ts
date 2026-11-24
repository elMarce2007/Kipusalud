import { Component, OnInit, inject, ViewChild, AfterViewInit, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { VentaService } from '../../../services/venta.service';
import { TIPOS_COMPROBANTE, Venta } from '../../../models/venta.model';
import { ClienteService } from '../../../services/cliente.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { descargarCsv } from '../../../shared/utils/csv';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    PageHeaderComponent,
    KpiCardComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header titulo="Historial de ventas y comprobantes" [migas]="[{ etiqueta: 'Ventas' }]"
                       descripcion="Los pagos con Yape, Plin, tarjeta o transferencia se registran manualmente; KipuSalud no procesa transacciones.">
        <button mat-stroked-button type="button" (click)="exportar()" [disabled]="!filtradas().length">
          <mat-icon>download</mat-icon> Exportar
        </button>
        <button mat-raised-button color="primary" routerLink="nueva">
          <mat-icon>point_of_sale</mat-icon> Nueva venta
        </button>
      </app-page-header>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      <section class="kpi-grid" aria-label="Resumen de hoy">
        <app-kpi-card etiqueta="Caja de hoy" [valor]="(resumenHoy().total | currency:'PEN':'S/ ')!"
                      nota="Ventas confirmadas" icono="payments" tono="primary" />
        <app-kpi-card etiqueta="Comprobantes de hoy" [valor]="resumenHoy().cantidad"
                      [nota]="resumenHoy().boletas + ' boletas · ' + resumenHoy().facturas + ' facturas'" icono="receipt_long" />
        <app-kpi-card etiqueta="Pendientes de inventario" [valor]="pendientes()"
                      nota="Reintentar desde la tabla" icono="sync_problem" [tono]="pendientes() ? 'warn' : 'ok'" />
      </section>

      <div class="filter-bar" role="search">
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por N° de comprobante, cliente o ID…" aria-label="Buscar venta"
                 [value]="texto()" (input)="texto.set($any($event.target).value)">
        </label>
        <select aria-label="Rango de fechas" [value]="rango()" (change)="rango.set($any($event.target).value)">
          <option value="hoy">Hoy</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="todo">Todo el historial</option>
        </select>
        <select aria-label="Tipo de comprobante" [value]="tipo()" (change)="tipo.set($any($event.target).value)">
          <option value="">Todos los comprobantes</option>
          <option value="BOLETA_INTERNA">Boleta</option>
          <option value="BOLETA_ELECTRONICA">Boleta electrónica</option>
          <option value="FACTURA">Factura</option>
        </select>
        <span class="filter-count">{{ filtradas().length }} ventas · {{ totalFiltrado() | currency:'PEN':'S/ ' }}</span>
      </div>

      <mat-card class="ledger-card">
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" matSort class="full-width">
              <ng-container matColumnDef="comprobante">
                <th mat-header-cell *matHeaderCellDef>N° comprobante</th>
                <td mat-cell *matCellDef="let row">
                  <div class="cell-title"><span>
                    <strong class="mono">{{ numero(row) }}</strong>
                    <small>{{ tipoLabel(row) }}</small>
                  </span></div>
                </td>
              </ng-container>

              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha / hora</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.fecha | date:'dd/MM/yyyy' }}<small class="sub">{{ row.fecha | date:'HH:mm' }}</small>
                </td>
              </ng-container>

              <ng-container matColumnDef="cliente">
                <th mat-header-cell *matHeaderCellDef>Cliente</th>
                <td mat-cell *matCellDef="let row">{{ nombreCliente(row) }}</td>
              </ng-container>

              <ng-container matColumnDef="metodoPago">
                <th mat-header-cell *matHeaderCellDef>Pago</th>
                <td mat-cell *matCellDef="let row"><span class="chip">{{ metodoPagoLabel(row.metodoPago) }}</span></td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Total</th>
                <td mat-cell *matCellDef="let row" class="num"><strong>{{ row.total | currency:'PEN':'S/ ' }}</strong></td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  <span class="chip" [class.ok]="row.estado === 'CONFIRMADA'" [class.warn]="row.estado === 'PENDIENTE_STOCK'"
                        [class.danger]="row.estado === 'ANULADA'">{{ estadoLabel(row.estado) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acción</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button [routerLink]="[row.id]" aria-label="Ver detalle e imprimir">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  @if (row.estado === 'PENDIENTE_STOCK') {
                    <button mat-icon-button color="warn" type="button"
                            aria-label="Reintentar confirmación de inventario"
                            [disabled]="retryingId() === row.id" (click)="reintentar(row)">
                      <mat-icon>{{ retryingId() === row.id ? 'hourglass_top' : 'sync' }}</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" colspan="7" style="text-align: center; padding: 20px;">
                  No hay ventas en el rango y filtros elegidos
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
export class VentaListComponent implements OnInit, AfterViewInit {
  private ventaService = inject(VentaService);
  private clienteService = inject(ClienteService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['comprobante', 'fecha', 'cliente', 'metodoPago', 'total', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Venta>();
  loadError = signal<string | null>(null);
  retryingId = signal<number | null>(null);

  ventas = signal<Venta[]>([]);
  nombresCliente = signal<Map<number, string>>(new Map());
  texto = signal('');
  rango = signal('todo');
  tipo = signal('');

  resumenHoy = computed(() => {
    const hoy = new Date().toDateString();
    const deHoy = this.ventas().filter(v => v.estado === 'CONFIRMADA' && new Date(v.fecha).toDateString() === hoy);
    return {
      total: deHoy.reduce((s, v) => s + Number(v.total ?? 0), 0),
      cantidad: deHoy.length,
      boletas: deHoy.filter(v => v.tipoComprobante !== 'FACTURA').length,
      facturas: deHoy.filter(v => v.tipoComprobante === 'FACTURA').length
    };
  });
  pendientes = computed(() => this.ventas().filter(v => v.estado === 'PENDIENTE_STOCK').length);

  filtradas = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    const tipo = this.tipo();
    const desde = this.inicioRango();
    return this.ventas().filter(v => {
      const fecha = new Date(v.fecha);
      const buscable = `${this.numero(v)} ${v.id} ${this.nombreCliente(v)}`.toLowerCase();
      return (!desde || fecha >= desde)
        && (!tipo || (v.tipoComprobante ?? 'BOLETA_INTERNA') === tipo)
        && (!texto || buscable.includes(texto));
    });
  });
  totalFiltrado = computed(() => this.filtradas()
    .filter(v => v.estado === 'CONFIRMADA').reduce((s, v) => s + Number(v.total ?? 0), 0));

  constructor() {
    effect(() => { this.dataSource.data = this.filtradas(); });
  }

  private inicioRango(): Date | null {
    const rango = this.rango();
    if (rango === 'todo') return null;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (rango !== 'hoy') inicio.setDate(inicio.getDate() - Number(rango) + 1);
    return inicio;
  }

  numero(v: Venta): string {
    return v.serieComprobante && v.numeroComprobante ? `${v.serieComprobante}-${v.numeroComprobante}` : `Venta #${v.id}`;
  }

  nombreCliente(v: Venta): string {
    return v.clienteId ? this.nombresCliente().get(v.clienteId) ?? `Cliente #${v.clienteId}` : 'Público general';
  }

  exportar() {
    descargarCsv('ventas.csv', ['Comprobante', 'Tipo', 'Fecha', 'Cliente', 'Pago', 'Total', 'Estado'],
      this.filtradas().map(v => [this.numero(v), this.tipoLabel(v), new Date(v.fecha).toLocaleString('es-PE'),
        this.nombreCliente(v), this.metodoPagoLabel(v.metodoPago), v.total, this.estadoLabel(v.estado)]));
  }

  tipoLabel(venta: Venta): string {
    return TIPOS_COMPROBANTE[venta.tipoComprobante ?? 'BOLETA_INTERNA'];
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
    // Los nombres son complementarios: si fallan, la tabla muestra el ID del cliente.
    this.clienteService.listar().subscribe({
      next: clientes => this.nombresCliente.set(new Map(clientes.filter(c => c.id != null)
        .map(c => [c.id!, c.razonSocial?.trim() || `${c.nombres} ${c.apellidos}`.trim()]))),
      error: err => console.error('No se pudieron cargar los nombres de clientes.', err)
    });
    this.ventaService.listar().subscribe({
      next: data => this.ventas.set(data),
      error: err => {
        console.error('No se pudo cargar el registro de ventas.', err);
        this.loadError.set('No se pudo cargar el registro de ventas de esta farmacia.');
      }
    });
  }

  metodoPagoLabel(metodo?: string): string {
    const labels: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      YAPE: 'Yape',
      PLIN: 'Plin',
      TARJETA: 'Tarjeta',
      TRANSFERENCIA: 'Transferencia',
      NO_ESPECIFICADO: 'Sin especificar'
    };
    return metodo ? labels[metodo] ?? 'Otro' : '—';
  }

  estadoLabel(estado?: string): string {
    switch (estado) {
      case 'CONFIRMADA': return 'Confirmada';
      case 'PENDIENTE_STOCK': return 'Pendiente de inventario';
      case 'ANULADA': return 'Anulada';
      case 'HISTORICA': return 'Histórica';
      default: return 'Desconocido';
    }
  }

  reintentar(venta: Venta): void {
    if (!venta.id || this.retryingId() !== null) {
      return;
    }
    this.retryingId.set(venta.id);
    this.ventaService.reintentar(venta.id).subscribe({
      next: () => {
        this.snackBar.open('Inventario confirmado y venta actualizada.', 'Cerrar', { duration: 4000 });
        this.cargarDatos();
        this.retryingId.set(null);
      },
      error: error => {
        console.error('No se pudo reintentar la confirmación de inventario.', error);
        this.snackBar.open(
          'La venta sigue pendiente. Corrige el inventario o la conexión y vuelve a intentar.',
          'Cerrar',
          { duration: 5000 });
        this.retryingId.set(null);
      }
    });
  }

}
