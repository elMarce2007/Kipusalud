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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { ClienteClinicalDialogComponent } from '../cliente-clinical-dialog.component';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
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
      <div class="page-header">
        <div>
          <p class="eyebrow">Relaciones de la farmacia</p>
          <h1>Clientes</h1>
        </div>
        <p class="privacy-hint">
          Los datos clínicos se mantienen separados de la ficha de contacto y solo los consultan usuarios autorizados.
        </p>
        <button mat-raised-button color="primary" routerLink="nuevo">
          <mat-icon>add</mat-icon> Nuevo Cliente
        </button>
      </div>

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
            <input matInput (keyup)="applyFilter($event)" placeholder="Buscar cliente...">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let row">{{ row.id }}</td>
            </ng-container>

            <ng-container matColumnDef="nombres">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombres</th>
              <td mat-cell *matCellDef="let row">{{ row.nombres }}</td>
            </ng-container>

            <ng-container matColumnDef="apellidos">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Apellidos</th>
              <td mat-cell *matCellDef="let row">{{ row.apellidos }}</td>
            </ng-container>

            <ng-container matColumnDef="dni">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>DNI</th>
              <td mat-cell *matCellDef="let row">{{ row.dni }}</td>
            </ng-container>

            <ng-container matColumnDef="telefono">
              <th mat-header-cell *matHeaderCellDef>Telefono</th>
              <td mat-cell *matCellDef="let row">{{ row.telefono }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let row">{{ row.email }}</td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button color="accent" aria-label="Iniciar venta rápida"
                        [routerLink]="['/ventas/nueva']"
                        [queryParams]="{ clienteId: row.id }">
                  <mat-icon>point_of_sale</mat-icon>
                </button>
                @if (canViewClinicalData()) {
                  <button mat-icon-button aria-label="Abrir ficha clínica" (click)="abrirFichaClinica(row)">
                    <mat-icon>medical_information</mat-icon>
                  </button>
                }
                <button mat-icon-button color="primary" [routerLink]="['editar', row.id]">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminar(row)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" colspan="7" style="text-align: center; padding: 20px;">
                No se encontraron resultados
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: ``
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

  displayedColumns = ['id', 'nombres', 'apellidos', 'dni', 'telefono', 'email', 'acciones'];
  dataSource = new MatTableDataSource<Cliente>();

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
      next: data => this.dataSource.data = data,
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
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
