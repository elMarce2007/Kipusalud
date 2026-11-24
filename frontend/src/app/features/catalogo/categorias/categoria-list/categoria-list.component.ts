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

import { CategoriaService } from '../../../../services/categoria.service';
import { Categoria, condicionDeVenta } from '../../../../models/categoria.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-categoria-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
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
      <app-page-header titulo="Categorías y familias terapéuticas"
                       [migas]="[{ etiqueta: 'Catálogo' }, { etiqueta: 'Categorías' }]">
        <button mat-raised-button color="primary" routerLink="nuevo">
          <mat-icon>add_circle</mat-icon> Nueva categoría
        </button>
      </app-page-header>

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
            <input matInput (keyup)="applyFilter($event)" placeholder="Nombre, descripción o código ATC…">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <table mat-table [dataSource]="dataSource" matSort class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let row">{{ row.id }}</td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
              <td mat-cell *matCellDef="let row">{{ row.nombre }}</td>
            </ng-container>

            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let row">{{ row.descripcion }}</td>
            </ng-container>

            <ng-container matColumnDef="codigoAtc">
              <th mat-header-cell *matHeaderCellDef>Código ATC</th>
              <td mat-cell *matCellDef="let row"><span class="mono">{{ row.codigoAtc || '—' }}</span></td>
            </ng-container>

            <ng-container matColumnDef="condicionVenta">
              <th mat-header-cell *matHeaderCellDef>Condición de venta</th>
              <td mat-cell *matCellDef="let row">
                <span class="chip" [class]="condicion(row).tono">{{ condicion(row).etiqueta }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
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
  styles: ``
})
export class CategoriaListComponent implements OnInit, AfterViewInit {
  private categoriaService = inject(CategoriaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loadError = signal<string | null>(null);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['id', 'nombre', 'codigoAtc', 'condicionVenta', 'descripcion', 'acciones'];
  condicion = (c: Categoria) => condicionDeVenta(c.condicionVenta);
  dataSource = new MatTableDataSource<Categoria>();

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargarDatos() {
    this.loadError.set(null);
    this.categoriaService.listar().subscribe({
      next: data => this.dataSource.data = data,
      error: err => {
        console.error('No se pudo cargar el catálogo de categorías.', err);
        this.loadError.set('No se pudieron cargar las categorías de esta farmacia.');
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  eliminar(categoria: Categoria) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Categoria',
        message: `Esta seguro de eliminar la categoria ${categoria.nombre}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && categoria.id) {
        this.categoriaService.eliminar(categoria.id).subscribe({
          next: () => {
            this.snackBar.open('Categoría eliminada', 'OK', { duration: 3000 });
            this.cargarDatos();
          },
          error: err => {
            console.error('No se pudo eliminar la categoría.', err);
            this.snackBar.open('No se pudo eliminar la categoría.', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}
