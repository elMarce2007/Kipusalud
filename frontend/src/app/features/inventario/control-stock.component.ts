import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { InventarioService } from '../../services/inventario.service';
import { ProductoService } from '../../services/producto.service';
import { AuthService } from '../../services/auth.service';
import { Producto } from '../../models/producto.model';
import {
  LoteInventario,
  MOTIVOS_AJUSTE,
  MotivoAjuste,
  ResumenInventario,
  diasParaVencer,
  tonoVencimiento
} from '../../models/inventario.model';
import { createIdempotencyKey } from '../../core/utils/idempotency-key';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import {
  ETIQUETAS_ESTADO_STOCK,
  StockMeterComponent,
  estadoStock,
  tonoEstadoStock
} from '../../shared/components/stock-meter/stock-meter.component';
import { descargarCsv } from '../../shared/utils/csv';

interface FilaControl {
  producto: Producto;
  resumen: ResumenInventario | undefined;
}

/** ECU07: control de stock por producto y lote activo, con bajas (ajustes) por lote. */
@Component({
  selector: 'app-control-stock',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, KpiCardComponent, StockMeterComponent],
  template: `
    <section class="kpi-grid" aria-label="Resumen de existencias">
      <app-kpi-card etiqueta="Catálogo activo" [valor]="filas().length" nota="Productos registrados" icono="inventory_2" />
      <app-kpi-card etiqueta="Stock bajo o crítico" [valor]="conteo().bajo" nota="Requieren reposición"
                    icono="trending_down" [tono]="conteo().bajo ? 'danger' : 'ok'" />
      <app-kpi-card etiqueta="Por vencer (< 60 días)" [valor]="conteo().porVencer" nota="Lotes: priorizar dispensación"
                    icono="event_busy" [tono]="conteo().porVencer ? 'warn' : 'ok'" />
      <app-kpi-card etiqueta="Unidades vencidas" [valor]="conteo().vencidas" nota="Retirar con un ajuste"
                    icono="delete_sweep" [tono]="conteo().vencidas ? 'danger' : 'ok'" />
    </section>

    <div class="filter-bar" role="search">
      <label class="search">
        <mat-icon>search</mat-icon>
        <input type="search" placeholder="Buscar producto o código de lote…" aria-label="Buscar en el control de stock"
               [value]="texto()" (input)="texto.set($any($event.target).value)">
      </label>
      <select aria-label="Filtro" [value]="filtro()" (change)="filtro.set($any($event.target).value)">
        <option value="">Todos</option>
        <option value="bajo">Crítico o bajo mínimo</option>
        <option value="vencer">Con lotes por vencer</option>
        <option value="vencidos">Con unidades vencidas</option>
      </select>
      <button mat-stroked-button type="button" (click)="exportar()" [disabled]="!filtradas().length">
        <mat-icon>download</mat-icon> Exportar
      </button>
    </div>

    @if (error()) {
      <div class="load-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button></div>
    }

    <div class="con-panel" [class.abierto]="!!seleccion()">
      <div class="tabla-card">
        <div class="table-wrap">
          <table class="tabla">
            <thead>
              <tr><th>Producto</th><th>Lote activo (FEFO)</th><th>Vencimiento</th><th>Stock actual / mín.</th>
                <th>Estado</th>@if (puedeAjustar) { <th>Acción</th> }</tr>
            </thead>
            <tbody>
              @for (f of filtradas(); track f.producto.id) {
                <tr [class.activa]="seleccion()?.producto?.id === f.producto.id">
                  <td><div class="cell-title"><span class="status-dot" [class]="tonoStock(f)"></span>
                    <span><strong>{{ f.producto.nombre }}</strong>
                      @if ((f.resumen?.unidadesVencidas ?? 0) > 0) {
                        <small class="vencidas">{{ f.resumen!.unidadesVencidas }} un. vencidas por retirar</small>
                      }</span></div></td>
                  <td class="mono">{{ f.resumen?.loteFefo?.codigoLote ?? '—' }}</td>
                  <td>
                    @if (f.resumen?.loteFefo; as fefo) {
                      <span class="vence" [class]="tonoVence(fefo.fechaVencimiento)">{{ fefo.fechaVencimiento | date:'MM/yyyy' }}</span>
                      <small class="sub">{{ textoDias(fefo.fechaVencimiento) }}</small>
                    } @else { <span class="sub">Sin lote vigente</span> }
                  </td>
                  <td><app-stock-meter [stock]="f.producto.stock" [minimo]="f.producto.stockMinimo" /></td>
                  <td><span class="chip" [class]="tonoStock(f)">{{ etiquetaStock(f) }}</span></td>
                  @if (puedeAjustar) {
                    <td><button mat-stroked-button type="button" (click)="abrirAjuste(f)" [disabled]="f.producto.stock <= 0 && !(f.resumen?.unidadesVencidas)">
                      <mat-icon>remove_circle_outline</mat-icon> Ajustar</button></td>
                  }
                </tr>
              } @empty {
                <tr><td [attr.colspan]="puedeAjustar ? 6 : 5" class="vacio">{{ cargando() ? 'Cargando…' : 'No hay productos con esos filtros.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="norma">Toda baja por merma o vencimiento queda registrada con lote, motivo y responsable en el Kardex.</p>
      </div>

      @if (seleccion(); as sel) {
        <aside class="detalle-panel" aria-label="Ajuste de stock">
          <header><span class="kpi-label">Nuevo ajuste de stock</span>
            <button mat-icon-button type="button" aria-label="Cerrar" (click)="cerrarAjuste()"><mat-icon>close</mat-icon></button></header>
          <h3>{{ sel.producto.nombre }}</h3>
          <form [formGroup]="ajusteForm" (ngSubmit)="registrarAjuste()">
            <label class="campo"><span>Lote</span>
              <select formControlName="loteId">
                <option [ngValue]="null">Selecciona el lote…</option>
                @for (l of lotesProducto(); track l.id) {
                  <option [value]="l.id">{{ l.codigoLote }} · vence {{ l.fechaVencimiento | date:'dd/MM/yyyy' }} · {{ l.cantidadDisponible }} un.{{ (diasLote(l) ?? 0) < 0 ? ' (VENCIDO)' : '' }}</option>
                }
              </select>
            </label>
            <label class="campo"><span>Unidades a retirar</span>
              <input type="number" min="1" step="1" formControlName="cantidad" [max]="maximoLote()">
              @if (loteElegido(); as l) { <small class="sub">Disponibles en el lote: {{ l.cantidadDisponible }}</small> }
            </label>
            <label class="campo"><span>Motivo</span>
              <select formControlName="motivo">
                @for (m of motivos; track m.valor) { <option [value]="m.valor">{{ m.etiqueta }}</option> }
              </select>
            </label>
            <label class="campo"><span>Observación{{ ajusteForm.controls.motivo.value === 'OTRO' ? ' (obligatoria)' : ' (opcional)' }}</span>
              <input type="text" maxlength="255" formControlName="observacion" placeholder="Ej.: acta de merma, frasco roto…">
            </label>
            @if (excedeLote()) { <p class="aviso" role="alert">No puedes retirar más unidades de las que tiene el lote.</p> }
            <button mat-raised-button color="primary" type="submit" [disabled]="!puedeRegistrar()">
              <mat-icon>remove_circle</mat-icon> Registrar baja
            </button>
          </form>
        </aside>
      }
    </div>
  `,
  styles: `
    .con-panel { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
    .con-panel.abierto { grid-template-columns: minmax(0, 1fr) 340px; }
    .tabla-card { border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius); background: #fff; overflow: hidden; }
    .tabla { width: 100%; border-collapse: collapse; }
    .tabla th { padding: 10px 12px; background: var(--kipu-paper); border-bottom: 2px solid var(--kipu-line); color: var(--kipu-soft);
      font-size: 11px; font-weight: 600; letter-spacing: .06em; text-align: left; text-transform: uppercase; white-space: nowrap; }
    .tabla td { padding: 10px 12px; border-bottom: 1px solid var(--kipu-line); vertical-align: middle; }
    .tabla tr:hover td { background: #fdfbf7; }
    .tabla tr.activa td { background: var(--kipu-danger-bg); }
    .vence { display: block; font-weight: 600; }
    .vence.ok { color: var(--kipu-ok-fg); } .vence.warn { color: var(--kipu-warn-fg); } .vence.danger { color: var(--kipu-danger-fg); }
    .sub { display: block; color: var(--kipu-soft); font-size: 12px; }
    .vencidas { display: block; color: var(--kipu-danger-fg); font-size: 12px; font-weight: 600; }
    .vacio { padding: 20px; text-align: center; color: var(--kipu-soft); }
    .norma { margin: 0; padding: 10px 16px; background: var(--kipu-paper); color: var(--kipu-soft); font-size: 12px; }
    .detalle-panel { position: sticky; top: 80px; padding: 18px 20px; border: 1px solid var(--kipu-line);
      border-top: 3px solid var(--kipu-primary-container); border-radius: var(--kipu-radius); background: #fff; }
    .detalle-panel header { display: flex; justify-content: space-between; align-items: center; }
    .detalle-panel h3 { margin: 4px 0 12px; }
    .campo { display: grid; gap: 4px; margin-bottom: 12px; font-size: 12px; color: var(--kipu-soft); }
    .campo input, .campo select { height: 40px; padding: 0 10px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius-sm); background: #fff; color: var(--kipu-ink); font-size: 14px; }
    .aviso { color: var(--kipu-danger-fg); background: var(--kipu-danger-bg); padding: 8px 10px; border-radius: 4px; font-size: 13px; }
    @media (max-width: 1100px) { .con-panel.abierto { grid-template-columns: 1fr; } .detalle-panel { position: static; } }
  `
})
export class ControlStockComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly productoService = inject(ProductoService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  /** El backend solo permite ajustes al Administrador y al Q.F. regente. */
  readonly puedeAjustar = ['ADMINISTRADOR', 'QF_REGENTE'].includes(this.authService.userRole());
  readonly motivos = MOTIVOS_AJUSTE;
  readonly tonoVence = tonoVencimiento;

  filas = signal<FilaControl[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  texto = signal('');
  filtro = signal('');
  seleccion = signal<FilaControl | null>(null);
  lotesProducto = signal<LoteInventario[]>([]);
  guardando = signal(false);
  private claveAjuste: string | null = null;

  ajusteForm = this.fb.group({
    loteId: this.fb.control<number | null>(null, Validators.required),
    cantidad: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
    motivo: this.fb.nonNullable.control<MotivoAjuste>('MERMA', Validators.required),
    observacion: this.fb.nonNullable.control('')
  });
  private valores = signal(this.ajusteForm.getRawValue());

  conteo = computed(() => {
    const filas = this.filas();
    return {
      bajo: filas.filter(f => ['critico', 'agotado'].includes(estadoStock(f.producto.stock, f.producto.stockMinimo))).length,
      porVencer: filas.reduce((s, f) => s + (f.resumen?.lotesPorVencer ?? 0), 0),
      vencidas: filas.reduce((s, f) => s + (f.resumen?.unidadesVencidas ?? 0), 0)
    };
  });

  filtradas = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    const filtro = this.filtro();
    return this.filas().filter(f => {
      const buscable = `${f.producto.nombre} ${f.resumen?.loteFefo?.codigoLote ?? ''}`.toLowerCase();
      const e = estadoStock(f.producto.stock, f.producto.stockMinimo);
      return (!texto || buscable.includes(texto))
        && (!filtro
          || (filtro === 'bajo' && (e === 'critico' || e === 'agotado'))
          || (filtro === 'vencer' && (f.resumen?.lotesPorVencer ?? 0) > 0)
          || (filtro === 'vencidos' && (f.resumen?.unidadesVencidas ?? 0) > 0));
    });
  });

  loteElegido = computed(() => this.lotesProducto().find(l => String(l.id) === String(this.valores().loteId)) ?? null);
  maximoLote = computed(() => this.loteElegido()?.cantidadDisponible ?? null);
  excedeLote = computed(() => {
    const max = this.maximoLote();
    return max !== null && (this.valores().cantidad ?? 0) > max;
  });
  puedeRegistrar = computed(() => {
    const v = this.valores();
    return !this.guardando() && !!this.loteElegido() && (v.cantidad ?? 0) >= 1 && !this.excedeLote()
      && (v.motivo !== 'OTRO' || !!v.observacion.trim());
  });

  constructor() {
    this.ajusteForm.valueChanges.subscribe(() => {
      this.valores.set(this.ajusteForm.getRawValue());
      this.claveAjuste = null;
    });
  }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ productos: this.productoService.listar(), resumen: this.inventarioService.resumen(60) }).subscribe({
      next: ({ productos, resumen }) => {
        const porProducto = new Map(resumen.map(r => [r.productoId, r]));
        this.filas.set(productos.map(p => ({ producto: p, resumen: porProducto.get(p.id!) })));
        this.cargando.set(false);
      },
      error: err => {
        console.error('No se pudo cargar el control de stock.', err);
        this.error.set('No se pudo cargar el control de stock.');
        this.cargando.set(false);
      }
    });
  }

  tonoStock(f: FilaControl) { return tonoEstadoStock(estadoStock(f.producto.stock, f.producto.stockMinimo)); }
  etiquetaStock(f: FilaControl) { return ETIQUETAS_ESTADO_STOCK[estadoStock(f.producto.stock, f.producto.stockMinimo)]; }
  diasLote(l: LoteInventario) { return diasParaVencer(l.fechaVencimiento); }

  textoDias(fecha: string): string {
    const dias = diasParaVencer(fecha);
    if (dias === null) return '';
    if (dias < 0) return 'Vencido';
    if (dias === 0) return 'Vence hoy';
    return dias < 60 ? `${dias} días · priorizar` : `${Math.round(dias / 30)} meses`;
  }

  abrirAjuste(fila: FilaControl) {
    this.seleccion.set(fila);
    this.ajusteForm.reset({ loteId: null, cantidad: 1, motivo: 'MERMA', observacion: '' });
    this.lotesProducto.set([]);
    this.inventarioService.listarLotes(fila.producto.id!).subscribe({
      next: lotes => {
        const conStock = lotes.filter(l => l.cantidadDisponible > 0);
        this.lotesProducto.set(conStock);
        // Si hay un lote vencido, se sugiere retirarlo primero.
        const vencido = conStock.find(l => (diasParaVencer(l.fechaVencimiento) ?? 0) < 0);
        if (vencido) {
          this.ajusteForm.patchValue({ loteId: vencido.id, cantidad: vencido.cantidadDisponible, motivo: 'VENCIMIENTO' });
        }
      },
      error: err => console.error('No se pudieron cargar los lotes del producto.', err)
    });
  }

  cerrarAjuste() {
    this.seleccion.set(null);
  }

  registrarAjuste() {
    const v = this.ajusteForm.getRawValue();
    if (!this.puedeRegistrar() || v.loteId == null || v.cantidad == null) return;
    this.guardando.set(true);
    this.claveAjuste ??= createIdempotencyKey();
    this.inventarioService.registrarAjuste({
      claveIdempotencia: this.claveAjuste,
      loteId: Number(v.loteId),
      cantidad: v.cantidad,
      motivo: v.motivo,
      observacion: v.observacion.trim() || null
    }).subscribe({
      next: ajuste => {
        this.guardando.set(false);
        this.claveAjuste = null;
        this.snackBar.open(`Baja registrada: ${ajuste.cantidadRetirada} un. del lote ${ajuste.codigoLote}. ` +
          `Stock actual: ${ajuste.stockProducto}.`, 'OK', { duration: 5000 });
        this.cerrarAjuste();
        this.cargar();
      },
      // El interceptor muestra el motivo; se conserva la clave para reintentar sin duplicar.
      error: () => this.guardando.set(false)
    });
  }

  exportar() {
    descargarCsv('control-de-stock.csv',
      ['Producto', 'Lote FEFO', 'Vencimiento', 'Stock', 'Stock mínimo', 'Estado', 'Lotes por vencer', 'Unidades vencidas'],
      this.filtradas().map(f => [f.producto.nombre, f.resumen?.loteFefo?.codigoLote ?? '',
        f.resumen?.loteFefo?.fechaVencimiento ?? '', f.producto.stock, f.producto.stockMinimo ?? 0,
        this.etiquetaStock(f), f.resumen?.lotesPorVencer ?? 0, f.resumen?.unidadesVencidas ?? 0]));
  }
}
