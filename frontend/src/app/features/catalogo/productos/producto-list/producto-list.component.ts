import { Component, OnInit, inject, ViewChild, AfterViewInit, signal, computed, effect } from '@angular/core';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe } from '@angular/common';

import { ProductoService } from '../../../../services/producto.service';
import { Producto } from '../../../../models/producto.model';
import { CategoriaService } from '../../../../services/categoria.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Categoria } from '../../../../models/categoria.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import {
  ETIQUETAS_ESTADO_STOCK,
  StockMeterComponent,
  estadoStock,
  tonoEstadoStock
} from '../../../../shared/components/stock-meter/stock-meter.component';
import { descargarCsv } from '../../../../shared/utils/csv';

@Component({
  selector: 'app-producto-list',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    PageHeaderComponent,
    KpiCardComponent,
    StockMeterComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header titulo="Catálogo de productos y stock"
                       [migas]="[{ etiqueta: 'Catálogo' }, { etiqueta: 'Productos y stock' }]">
        <button mat-stroked-button type="button" (click)="exportar()" [disabled]="!filtrados().length">
          <mat-icon>download</mat-icon> Exportar
        </button>
        <button mat-raised-button color="primary" routerLink="nuevo">
          <mat-icon>add_circle</mat-icon> Nuevo producto
        </button>
      </app-page-header>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      <section class="kpi-grid" aria-label="Resumen del catálogo">
        <app-kpi-card etiqueta="Productos registrados" [valor]="productos().length"
                      nota="En el catálogo de la farmacia" icono="medication" tono="primary" />
        <app-kpi-card etiqueta="Stock óptimo" [valor]="conteo().optimo"
                      [nota]="porcentajeOptimo() + '% del catálogo'" icono="check_circle" tono="ok" />
        <app-kpi-card etiqueta="Por reponer" [valor]="conteo().porReponer"
                      nota="Cerca del mínimo" icono="add_shopping_cart" tono="warn" />
        <app-kpi-card etiqueta="Crítico o agotado" [valor]="conteo().critico"
                      nota="Bajo el stock mínimo" icono="priority_high" tono="danger" />
      </section>

      <div class="filter-bar" role="search">
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por nombre o descripción…" aria-label="Buscar producto"
                 [value]="texto()" (input)="texto.set($any($event.target).value)">
        </label>
        <select aria-label="Categoría" [value]="categoria()" (change)="categoria.set($any($event.target).value)">
          <option value="">Todas las categorías</option>
          @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }
        </select>
        <select aria-label="Estado del stock" [value]="estado()" (change)="estado.set($any($event.target).value)">
          <option value="">Todos los estados</option>
          <option value="optimo">Óptimo</option>
          <option value="por-reponer">Por reponer</option>
          <option value="critico">Crítico o agotado</option>
          <option value="sin-minimo">Sin mínimo configurado</option>
        </select>
        <span class="filter-count">Mostrando {{ filtrados().length }} de {{ productos().length }}</span>
      </div>

      <mat-card class="ledger-card">
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" matSort class="full-width">
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Producto</th>
                <td mat-cell *matCellDef="let row">
                  <div class="cell-title">
                    <span class="status-dot" [class]="tono(row)"></span>
                    <span>
                      <strong>{{ row.nombre }}</strong>
                      @if (row.descripcion) { <small>{{ row.descripcion }}</small> }
                    </span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="categoria">
                <th mat-header-cell *matHeaderCellDef>Categoría</th>
                <td mat-cell *matCellDef="let row"><span class="chip">{{ row.categoriaNombre || '—' }}</span></td>
              </ng-container>

              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Stock actual / mín.</th>
                <td mat-cell *matCellDef="let row">
                  <app-stock-meter [stock]="row.stock" [minimo]="row.stockMinimo" />
                </td>
              </ng-container>

              <ng-container matColumnDef="precio">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">P. venta</th>
                <td mat-cell *matCellDef="let row" class="num">{{ row.precio | currency:'PEN':'S/ ' }}</td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row"><span class="chip" [class]="tono(row)">{{ etiquetaEstado(row) }}</span></td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button [routerLink]="['editar', row.id]" aria-label="Editar producto">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminar(row)" aria-label="Eliminar producto">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" colspan="6" style="text-align: center; padding: 20px;">
                  No se encontraron productos con esos filtros
                </td>
              </tr>
            </table>
          </div>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: ``
})
export class ProductoListComponent implements OnInit, AfterViewInit {
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['nombre', 'categoria', 'stock', 'precio', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Producto>();
  loadError = signal<string | null>(null);

  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  texto = signal('');
  categoria = signal('');
  estado = signal('');

  conteo = computed(() => {
    const estados = this.productos().map(p => estadoStock(p.stock, p.stockMinimo));
    return {
      optimo: estados.filter(e => e === 'optimo').length,
      porReponer: estados.filter(e => e === 'por-reponer').length,
      critico: estados.filter(e => e === 'critico' || e === 'agotado').length
    };
  });
  porcentajeOptimo = computed(() => this.productos().length
    ? Math.round(this.conteo().optimo * 100 / this.productos().length) : 0);

  filtrados = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    const categoria = this.categoria();
    const estado = this.estado();
    return this.productos().filter(p => {
      const e = estadoStock(p.stock, p.stockMinimo);
      return (!texto || `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(texto))
        && (!categoria || String(p.categoriaId) === categoria)
        && (!estado || (estado === 'critico' ? e === 'critico' || e === 'agotado' : e === estado));
    });
  });

  constructor() {
    effect(() => { this.dataSource.data = this.filtrados(); });
  }

  tono(p: Producto) { return tonoEstadoStock(estadoStock(p.stock, p.stockMinimo)); }
  etiquetaEstado(p: Producto) { return ETIQUETAS_ESTADO_STOCK[estadoStock(p.stock, p.stockMinimo)]; }

  exportar() {
    const filas = this.filtrados().map(p => [p.nombre, p.descripcion ?? '', p.categoriaNombre ?? '',
      p.precio, p.stock, p.stockMinimo ?? 0, this.etiquetaEstado(p)]);
    descargarCsv('productos-y-stock.csv',
      ['Producto', 'Descripción', 'Categoría', 'Precio', 'Stock', 'Stock mínimo', 'Estado'], filas);
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
    forkJoin({
      productos: this.productoService.listar(),
      categorias: this.categoriaService.listar()
    }).subscribe({
      next: ({ productos, categorias }) => {
        const nombrePorCategoria = new Map(categorias.map(categoria => [categoria.id, categoria.nombre]));
        this.categorias.set(categorias);
        this.productos.set(productos.map(producto => ({
          ...producto,
          categoriaNombre: nombrePorCategoria.get(producto.categoriaId)
        })));
      },
      error: err => {
        console.error('No se pudo cargar el inventario.', err);
        this.loadError.set('No se pudo cargar el inventario de esta farmacia.');
      }
    });
  }

  eliminar(producto: Producto) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Producto',
        message: `Esta seguro de eliminar el producto ${producto.nombre}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && producto.id) {
        this.productoService.eliminar(producto.id).subscribe({
          next: () => {
            this.snackBar.open('Producto eliminado', 'OK', { duration: 3000 });
            this.cargarDatos();
          },
          error: err => {
            console.error('No se pudo eliminar el producto.', err);
            this.snackBar.open('No se pudo eliminar el producto.', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}
