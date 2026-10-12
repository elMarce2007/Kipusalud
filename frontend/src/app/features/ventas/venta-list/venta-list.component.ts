import { Component, OnInit, inject, ViewChild, AfterViewInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { VentaService } from '../../../services/venta.service';
import { Venta } from '../../../models/venta.model';

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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Registro comercial</p>
          <h1>Ventas y despacho</h1>
        </div>
        <button mat-raised-button color="primary" routerLink="nueva">
          <mat-icon>add</mat-icon> Nueva Venta
        </button>
      </div>

      <p class="payment-disclaimer">
        Los métodos de pago externos se registran manualmente; KipuSalud no procesa transacciones.
      </p>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      <mat-card>
        <mat-card-content>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Buscar</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Buscar venta...">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let row">{{ row.id }}</td>
            </ng-container>

            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
              <td mat-cell *matCellDef="let row">{{ row.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="clienteId">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Cliente ID</th>
              <td mat-cell *matCellDef="let row">{{ row.clienteId }}</td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th>
              <td mat-cell *matCellDef="let row">{{ row.total | currency:'PEN':'S/ ' }}</td>
            </ng-container>

            <ng-container matColumnDef="metodoPago">
              <th mat-header-cell *matHeaderCellDef>Método de pago</th>
              <td mat-cell *matCellDef="let row">{{ metodoPagoLabel(row.metodoPago) }}</td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">{{ estadoLabel(row.estado) }}</td>
            </ng-container>

            <ng-container matColumnDef="items">
              <th mat-header-cell *matHeaderCellDef>Items</th>
              <td mat-cell *matCellDef="let row">{{ row.detalles?.length || 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button color="primary" [routerLink]="[row.id]">
                  <mat-icon aria-label="Ver venta">visibility</mat-icon>
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
              <td class="mat-cell" colspan="8" style="text-align: center; padding: 20px;">
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
    .payment-disclaimer { margin: -12px 0 20px; color: var(--kipu-muted); font-size: 12px; }
  `
})
export class VentaListComponent implements OnInit, AfterViewInit {
  private ventaService = inject(VentaService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['id', 'fecha', 'clienteId', 'total', 'metodoPago', 'estado', 'items', 'acciones'];
  dataSource = new MatTableDataSource<Venta>();
  loadError = signal<string | null>(null);
  retryingId = signal<number | null>(null);

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargarDatos() {
    this.loadError.set(null);
    this.ventaService.listar().subscribe({
      next: data => this.dataSource.data = data,
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
