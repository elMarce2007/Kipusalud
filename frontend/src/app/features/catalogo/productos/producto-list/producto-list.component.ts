import { Component, OnInit, inject, ViewChild, AfterViewInit, signal, computed, effect } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { ProductoService } from '../../../../services/producto.service';
import { Producto, coincideProducto, resumenFicha } from '../../../../models/producto.model';
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
import { InventarioService } from '../../../../services/inventario.service';
import {
  LoteInventario,
  MovimientoInventario,
  ResumenInventario,
  tonoVencimiento
} from '../../../../models/inventario.model';
import { LineaVidaLoteComponent } from '../../../../shared/components/linea-vida-lote/linea-vida-lote.component';

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
    StockMeterComponent,
    LineaVidaLoteComponent,
    DatePipe
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
        <app-kpi-card etiqueta="Lotes por vencer" [valor]="lotesPorVencer()"
                      nota="En los próximos 60 días" icono="event_busy" [tono]="lotesPorVencer() ? 'warn' : 'ok'" />
      </section>

      <div class="filter-bar" role="search">
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Nombre, principio activo, laboratorio o código de barras…" aria-label="Buscar producto"
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

      <div class="con-panel" [class.abierto]="!!seleccionado()">
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
                      @if (row.principioActivo || row.presentacion) {
                        <small>{{ ficha(row) }}</small>
                      } @else if (row.descripcion) { <small>{{ row.descripcion }}</small> }
                      @if (row.laboratorio) { <small class="lab">{{ row.laboratorio }}</small> }
                    </span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="categoria">
                <th mat-header-cell *matHeaderCellDef>Categoría</th>
                <td mat-cell *matCellDef="let row"><span class="chip">{{ row.categoriaNombre || '—' }}</span></td>
              </ng-container>

              <ng-container matColumnDef="lote">
                <th mat-header-cell *matHeaderCellDef>Lote FEFO / vence</th>
                <td mat-cell *matCellDef="let row">
                  @if (resumenDe(row)?.loteFefo; as fefo) {
                    <span class="mono lote">{{ fefo.codigoLote }}</span>
                    <span class="vence" [class]="tonoVence(fefo.fechaVencimiento)">
                      {{ fefo.fechaVencimiento | date:'MMM yyyy' }}
                    </span>
                  } @else {
                    <span class="sub">Sin lote vigente</span>
                  }
                  @if ((resumenDe(row)?.unidadesVencidas ?? 0) > 0) {
                    <span class="chip danger vencidas">{{ resumenDe(row)!.unidadesVencidas }} un. vencidas</span>
                  }
                </td>
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
                <td mat-cell *matCellDef="let row" (click)="$event.stopPropagation()">
                  <button mat-icon-button [routerLink]="['editar', row.id]" aria-label="Editar producto">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminar(row)" aria-label="Eliminar producto">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="fila"
                  [class.activa]="seleccionado()?.id === row.id" (click)="seleccionar(row)"></tr>

              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" colspan="7" style="text-align: center; padding: 20px;">
                  No se encontraron productos con esos filtros
                </td>
              </tr>
            </table>
          </div>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>

      @if (seleccionado(); as p) {
        <aside class="detalle-panel" aria-label="Detalle del producto">
          <header>
            <span class="kpi-label">Producto seleccionado</span>
            <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="seleccionado.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </header>
          <h2>{{ p.nombre }}</h2>
          @if (p.descripcion) { <p class="sub">{{ p.descripcion }}</p> }
          @if (p.principioActivo || p.laboratorio || p.presentacion || p.registroSanitario || p.codigoBarras || p.ubicacion) {
            <dl class="ficha">
              @if (p.principioActivo) { <dt>Principio activo</dt><dd>{{ p.principioActivo }}</dd> }
              @if (p.presentacion) { <dt>Presentación</dt><dd>{{ p.presentacion }}</dd> }
              @if (p.laboratorio) { <dt>Laboratorio</dt><dd>{{ p.laboratorio }}</dd> }
              @if (p.registroSanitario) { <dt>Reg. sanitario</dt><dd class="mono">{{ p.registroSanitario }}</dd> }
              @if (p.codigoBarras) { <dt>Código de barras</dt><dd class="mono">{{ p.codigoBarras }}</dd> }
              @if (p.ubicacion) { <dt>Ubicación</dt><dd>{{ p.ubicacion }}</dd> }
            </dl>
          }
          <app-stock-meter [stock]="p.stock" [minimo]="p.stockMinimo" />

          <h3 class="kpi-label">Lotes con existencias</h3>
          @if (cargandoDetalle()) {
            <p class="sub">Cargando lotes…</p>
          } @else {
            <ul class="lotes">
              @for (l of lotesSeleccionado(); track l.id; let primero = $first) {
                <li>
                  <span class="mono">{{ l.codigoLote }}</span>
                  <span class="vence" [class]="tonoVence(l.fechaVencimiento)">{{ l.fechaVencimiento | date:'dd/MM/yyyy' }}</span>
                  <span class="num">{{ l.cantidadDisponible }}/{{ l.cantidadInicial }}</span>
                  @if (primero && l.cantidadDisponible > 0) { <span class="chip ok">FEFO #1</span> }
                </li>
              } @empty {
                <li class="sub">Sin lotes con existencias.</li>
              }
            </ul>
            <h3 class="kpi-label">Línea de vida del lote</h3>
            <app-linea-vida-lote [movimientos]="kardexSeleccionado()" />
          }
          <div class="acciones-panel">
            <a mat-stroked-button routerLink="/inventario"><mat-icon>add_box</mat-icon> Registrar ingreso</a>
            <a mat-stroked-button [routerLink]="['editar', p.id]"><mat-icon>edit</mat-icon> Editar</a>
          </div>
        </aside>
      }
      </div>
    </div>
  `,
  styles: `
    .con-panel { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
    .con-panel.abierto { grid-template-columns: minmax(0, 1fr) 360px; }
    .fila { cursor: pointer; }
    .fila.activa { background: var(--kipu-danger-bg) !important; }
    .lote { display: block; font-size: 12px; }
    .vence { display: inline-block; font-size: 12px; font-weight: 600; }
    .vence.ok { color: var(--kipu-ok-fg); }
    .vence.warn { color: var(--kipu-warn-fg); }
    .vence.danger { color: var(--kipu-danger-fg); }
    .vencidas { margin-top: 4px; }
    .sub { display: block; color: var(--kipu-soft); font-size: 12px; }
    .detalle-panel { position: sticky; top: 80px; padding: 18px 20px; border: 1px solid var(--kipu-line);
      border-top: 3px solid var(--kipu-primary-container); border-radius: var(--kipu-radius); background: #fff; }
    .detalle-panel header { display: flex; justify-content: space-between; align-items: center; }
    .detalle-panel h2 { margin: 4px 0; font-size: 22px; }
    .detalle-panel h3 { margin: 18px 0 8px; }
    .lotes { list-style: none; margin: 0; padding: 0; }
    .lotes li { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: center;
      padding: 6px 0; border-bottom: 1px solid var(--kipu-line); font-size: 13px; }
    .lab { color: var(--kipu-soft); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .ficha { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 10px 0 14px; font-size: 13px; }
    .ficha dt { color: var(--kipu-soft); }
    .ficha dd { margin: 0; }
    .acciones-panel { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    @media (max-width: 1100px) { .con-panel.abierto { grid-template-columns: 1fr; } .detalle-panel { position: static; } }
  `
})
export class ProductoListComponent implements OnInit, AfterViewInit {
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private inventarioService = inject(InventarioService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['nombre', 'categoria', 'lote', 'stock', 'precio', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Producto>();
  loadError = signal<string | null>(null);

  productos = signal<Producto[]>([]);
  resumenes = signal<Map<number, ResumenInventario>>(new Map());
  lotesPorVencer = computed(() => [...this.resumenes().values()].reduce((s, r) => s + r.lotesPorVencer, 0));
  seleccionado = signal<Producto | null>(null);
  lotesSeleccionado = signal<LoteInventario[]>([]);
  kardexSeleccionado = signal<MovimientoInventario[]>([]);
  cargandoDetalle = signal(false);
  readonly tonoVence = tonoVencimiento;

  resumenDe(p: Producto): ResumenInventario | undefined {
    return this.resumenes().get(p.id!);
  }

  seleccionar(producto: Producto) {
    if (this.seleccionado()?.id === producto.id) {
      this.seleccionado.set(null);
      return;
    }
    this.seleccionado.set(producto);
    this.cargandoDetalle.set(true);
    forkJoin({
      lotes: this.inventarioService.listarLotes(producto.id!),
      kardex: this.inventarioService.listarKardex(producto.id!)
    }).subscribe({
      next: ({ lotes, kardex }) => {
        if (this.seleccionado()?.id !== producto.id) return;
        this.lotesSeleccionado.set(lotes.filter(l => l.cantidadDisponible > 0));
        this.kardexSeleccionado.set(kardex.slice(0, 12));
        this.cargandoDetalle.set(false);
      },
      error: err => {
        console.error('No se pudo cargar el detalle de lotes.', err);
        this.lotesSeleccionado.set([]);
        this.kardexSeleccionado.set([]);
        this.cargandoDetalle.set(false);
      }
    });
  }
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
      return coincideProducto(p, texto)
        && (!categoria || String(p.categoriaId) === categoria)
        && (!estado || (estado === 'critico' ? e === 'critico' || e === 'agotado' : e === estado));
    });
  });

  constructor() {
    effect(() => { this.dataSource.data = this.filtrados(); });
  }

  ficha = (p: Producto) => resumenFicha(p);

  tono(p: Producto) { return tonoEstadoStock(estadoStock(p.stock, p.stockMinimo)); }
  etiquetaEstado(p: Producto) { return ETIQUETAS_ESTADO_STOCK[estadoStock(p.stock, p.stockMinimo)]; }

  exportar() {
    const filas = this.filtrados().map(p => [p.nombre, p.principioActivo ?? '', p.presentacion ?? '',
      p.laboratorio ?? '', p.registroSanitario ?? '', p.codigoBarras ?? '', p.categoriaNombre ?? '',
      p.precio, p.stock, p.stockMinimo ?? 0, this.etiquetaEstado(p)]);
    descargarCsv('productos-y-stock.csv',
      ['Producto', 'Principio activo', 'Presentación', 'Laboratorio', 'Registro sanitario', 'Código de barras',
        'Categoría', 'Precio', 'Stock', 'Stock mínimo', 'Estado'], filas);
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
      categorias: this.categoriaService.listar(),
      // El resumen de lotes es complementario: si falla, la tabla se muestra sin esa columna llena.
      resumen: this.inventarioService.resumen(60).pipe(catchError(() => of([] as ResumenInventario[])))
    }).subscribe({
      next: ({ productos, categorias, resumen }) => {
        this.resumenes.set(new Map(resumen.map(r => [r.productoId, r])));
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
