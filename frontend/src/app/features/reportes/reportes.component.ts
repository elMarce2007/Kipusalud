import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { AuthService } from '../../services/auth.service';
import { ProductoService } from '../../services/producto.service';
import { ReporteService } from '../../services/reporte.service';
import { Producto } from '../../models/producto.model';
import { MOTIVOS_AJUSTE } from '../../models/inventario.model';
import { HORARIO_TURNO, etiquetaTurno } from '../../models/personal.model';
import {
  KardexValorizado,
  ReporteMermas,
  ReporteVentasTurno,
  TASA_MERMA_TOLERADA,
  participacion,
  rangoDelMes
} from '../../models/reporte.model';
import { CeldaXlsx, descargarXlsx } from '../../shared/utils/xlsx';

type TipoReporte = 'kardex' | 'mermas' | 'turnos';

const TIPOS: { valor: TipoReporte; etiqueta: string; icono: string; permiso: string }[] = [
  { valor: 'kardex', etiqueta: 'Kardex valorizado', icono: 'receipt_long', permiso: 'INVENTARIO:VER' },
  { valor: 'mermas', etiqueta: 'Mermas y bajas', icono: 'delete_sweep', permiso: 'INVENTARIO:VER' },
  { valor: 'turnos', etiqueta: 'Ventas por turno', icono: 'schedule', permiso: 'VENTAS:VER' }
];

const METODOS: Record<string, string> = {
  EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia'
};

const TIPOS_MOVIMIENTO: Record<string, string> = {
  INGRESO: 'Ingreso por compra', VENTA: 'Egreso por venta', AJUSTE: 'Baja / ajuste'
};

/** Reportes logísticos (Kardex valorizado y mermas) y de ventas por turno; exportables a Excel y PDF. */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatButtonModule, MatIconModule, PageHeaderComponent, KpiCardComponent],
  template: `
    <div class="page-container">
      <app-page-header titulo="Reportes logísticos, Kardex y ventas"
                       descripcion="Kardex físico-valorizado por lote, control de mermas y ventas por turno, listos para Excel o PDF."
                       [migas]="[{ etiqueta: 'Reportes' }]">
        <div class="no-print acciones">
          <button mat-stroked-button type="button" (click)="exportarExcel()" [disabled]="!hayResultado()">
            <mat-icon>table_view</mat-icon> Exportar Excel
          </button>
          <button mat-raised-button color="primary" type="button" (click)="imprimir()" [disabled]="!hayResultado()">
            <mat-icon>picture_as_pdf</mat-icon> Descargar PDF
          </button>
        </div>
      </app-page-header>

      <div class="solo-impresion encabezado-impresion">
        <strong>{{ farmacia() }}</strong> · {{ tituloActual() }} · del {{ desde() | date:'dd/MM/yyyy' }}
        al {{ hasta() | date:'dd/MM/yyyy' }} · generado el {{ generadoEn() | date:'dd/MM/yyyy HH:mm' }}
        por {{ usuario() }}
      </div>

      <section class="filtros no-print" aria-label="Parámetros del reporte">
        <div class="tipos" role="tablist">
          @for (t of tipos(); track t.valor) {
            <button type="button" role="tab" [attr.aria-selected]="tipo() === t.valor"
                    [class.activo]="tipo() === t.valor" (click)="cambiarTipo(t.valor)">
              <mat-icon>{{ t.icono }}</mat-icon> {{ t.etiqueta }}
            </button>
          }
        </div>
        <div class="campos">
          @if (tipo() === 'kardex') {
            <label class="producto">
              <span>Producto</span>
              <select (change)="productoId.set(+$any($event.target).value || null)">
                <option value="" [selected]="!productoId()">Selecciona un producto…</option>
                @for (p of productos(); track p.id) {
                  <option [value]="p.id" [selected]="p.id === productoId()">{{ p.nombre }}{{ p.presentacion ? ' · ' + p.presentacion : '' }}</option>
                }
              </select>
            </label>
          }
          <label>
            <span>Desde</span>
            <input type="date" [value]="desde()" [max]="hasta()" (change)="desde.set($any($event.target).value)">
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" [value]="hasta()" [min]="desde()" (change)="hasta.set($any($event.target).value)">
          </label>
          <button mat-raised-button color="accent" type="button" class="generar"
                  [disabled]="cargando() || !puedeGenerar()" (click)="generar()">
            <mat-icon>sync_alt</mat-icon> {{ cargando() ? 'Generando…' : 'Generar reporte' }}
          </button>
        </div>
        @if (tipo() === 'kardex') {
          <p class="nota"><mat-icon>info</mat-icon> Valorización por lote al costo de compra registrado en cada ingreso.</p>
        }
      </section>

      @switch (tipo()) {
        @case ('kardex') {
          @if (kardex(); as k) {
            <section class="kpi-grid">
              <app-kpi-card etiqueta="Saldo inicial" [valor]="k.saldoInicialUnidades + ' un.'"
                            [nota]="(k.saldoInicialValor | currency:'PEN':'S/ ') ?? ''" icono="inventory" />
              <app-kpi-card etiqueta="Entradas / salidas" [valor]="'+' + k.totalEntradas + ' / −' + k.totalSalidas"
                            nota="Unidades del período" icono="swap_vert" tono="primary" />
              <app-kpi-card etiqueta="Costo promedio unit." [valor]="k.costoPromedio != null ? ((k.costoPromedio | currency:'PEN':'S/ ':'1.2-4') ?? '') : '—'"
                            nota="Saldo valorizado ÷ unidades" icono="calculate" />
              <app-kpi-card etiqueta="Saldo valorizado" [valor]="(k.saldoFinalValor | currency:'PEN':'S/ ') ?? ''"
                            [nota]="k.saldoFinalUnidades + ' un. en stock físico'" icono="account_balance_wallet"
                            [tono]="k.unidadesSinCosto ? 'warn' : 'ok'" />
            </section>
            <section class="tarjeta">
              <header class="cabecera-tabla">
                <div>
                  <h2>{{ k.producto }}</h2>
                  <p class="sub">
                    {{ [k.principioActivo, k.presentacion].filter(hayTexto).join(' · ') || 'Sin ficha registrada' }}
                    @if (k.registroSanitario) { · Registro sanitario {{ k.registroSanitario }} }
                  </p>
                </div>
                @if (k.unidadesSinCosto) {
                  <span class="chip warn">{{ k.unidadesSinCosto }} un. movidas sin costo registrado</span>
                }
              </header>
              <div class="table-wrap">
                <table class="reporte">
                  <thead>
                    <tr><th>Fecha / hora</th><th>Comprobante / guía</th><th>Movimiento</th><th>Lote</th><th>Venc.</th>
                      <th class="num">Entrada</th><th class="num">Salida</th><th class="num">Saldo físico</th>
                      <th class="num">C. unit.</th><th class="num">Saldo valoriz.</th></tr>
                  </thead>
                  <tbody>
                    <tr class="inicial">
                      <td>{{ k.desde | date:'dd/MM/yyyy' }}</td><td>—</td><td><span class="chip">Saldo inicial</span></td>
                      <td></td><td></td><td></td><td></td>
                      <td class="num">{{ k.saldoInicialUnidades | number }}</td><td></td>
                      <td class="num">{{ k.saldoInicialValor | currency:'PEN':'S/ ' }}</td>
                    </tr>
                    @for (f of k.filas; track f.id) {
                      <tr [class.baja]="f.tipo === 'AJUSTE'">
                        <td>{{ f.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ f.tipo === 'AJUSTE' ? motivo(f.referencia) : f.referencia }}</td>
                        <td><span class="chip" [class.ok]="f.tipo === 'INGRESO'" [class.danger]="f.tipo === 'AJUSTE'">{{ tipoMovimiento(f.tipo) }}</span></td>
                        <td class="mono">{{ f.codigoLote || '—' }}</td>
                        <td>{{ f.fechaVencimiento ? (f.fechaVencimiento | date:'MM/yyyy') : '—' }}</td>
                        <td class="num">{{ f.entrada ? '+' + f.entrada : '—' }}</td>
                        <td class="num">{{ f.salida || '—' }}</td>
                        <td class="num">{{ f.saldoUnidades | number }}</td>
                        <td class="num">{{ f.costoUnitario != null ? (f.costoUnitario | number:'1.2-4') : '—' }}</td>
                        <td class="num">{{ f.saldoValor | currency:'PEN':'S/ ' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="10" class="vacio">Sin movimientos en el período.</td></tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr><td colspan="5">Saldo final al {{ k.hasta | date:'dd/MM/yyyy' }}</td>
                      <td class="num">+{{ k.totalEntradas }}</td><td class="num">{{ k.totalSalidas }}</td>
                      <td class="num">{{ k.saldoFinalUnidades | number }}</td><td></td>
                      <td class="num">{{ k.saldoFinalValor | currency:'PEN':'S/ ' }}</td></tr>
                  </tfoot>
                </table>
              </div>
            </section>
          } @else {
            <p class="vacio-grande">Elige un producto y un período, y pulsa «Generar reporte».</p>
          }
        }
        @case ('mermas') {
          @if (mermas(); as m) {
            <section class="kpi-grid">
              <app-kpi-card etiqueta="Unidades dadas de baja" [valor]="m.unidadesMerma" icono="delete_sweep"
                            [nota]="m.filas.length + ' registros de baja'" />
              <app-kpi-card etiqueta="Valor de la merma" [valor]="(m.valorMerma | currency:'PEN':'S/ ') ?? ''"
                            nota="Al costo de compra del lote" icono="payments" tono="danger" />
              <app-kpi-card etiqueta="Tasa de merma" [valor]="(m.tasaMerma | number:'1.2-2') + '%'"
                            [nota]="m.tasaMerma <= tolerada ? 'Dentro del rango tolerado (< ' + tolerada + '%)' : 'Sobre el rango tolerado (' + tolerada + '%)'"
                            icono="trending_down" [tono]="m.tasaMerma <= tolerada ? 'ok' : 'warn'" />
              <app-kpi-card etiqueta="Unidades vendidas" [valor]="m.unidadesVendidas" nota="Base de la tasa"
                            icono="point_of_sale" />
            </section>
            <div class="dos-columnas">
              <section class="tarjeta">
                <h2>Por motivo</h2>
                <ul class="barras">
                  @for (g of m.porMotivo; track g.motivo) {
                    <li>
                      <div class="fila-barra"><span>{{ motivo(g.motivo) }}</span>
                        <strong>{{ g.unidades }} un. · {{ g.valor | currency:'PEN':'S/ ' }}</strong></div>
                      <div class="barra"><i [style.width.%]="pct(g.unidades, m.unidadesMerma)"></i></div>
                    </li>
                  } @empty {
                    <li class="vacio">Sin bajas en el período.</li>
                  }
                </ul>
              </section>
              <section class="tarjeta ancho">
                <h2>Detalle de bajas</h2>
                <div class="table-wrap">
                  <table class="reporte">
                    <thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Motivo</th><th class="num">Cant.</th>
                      <th class="num">Valor</th><th>Responsable</th></tr></thead>
                    <tbody>
                      @for (f of m.filas; track f.id) {
                        <tr>
                          <td>{{ f.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                          <td>{{ f.producto }}</td>
                          <td class="mono">{{ f.codigoLote || '—' }}</td>
                          <td>{{ motivo(f.motivo) }}@if (f.observacion) { <small class="sub">{{ f.observacion }}</small> }</td>
                          <td class="num">{{ f.cantidad }}</td>
                          <td class="num">{{ f.valor != null ? (f.valor | currency:'PEN':'S/ ') : '—' }}</td>
                          <td>{{ f.actor }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="7" class="vacio">Sin bajas en el período.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          } @else {
            <p class="vacio-grande">Elige un período y pulsa «Generar reporte».</p>
          }
        }
        @case ('turnos') {
          @if (turnos(); as t) {
            <section class="kpi-grid">
              <app-kpi-card etiqueta="Total vendido" [valor]="(t.total | currency:'PEN':'S/ ') ?? ''"
                            [nota]="t.ventas + ' ventas confirmadas'" icono="point_of_sale" tono="primary" />
              <app-kpi-card etiqueta="Ticket promedio" [valor]="(t.ticketPromedio | currency:'PEN':'S/ ') ?? ''"
                            nota="Por venta confirmada" icono="receipt" />
              <app-kpi-card etiqueta="No confirmadas" [valor]="t.noConfirmadas" nota="Pendientes o anuladas"
                            icono="pending" [tono]="t.noConfirmadas ? 'warn' : 'ok'" />
            </section>
            <section class="turnos">
              @for (g of t.porTurno; track g.clave) {
                <article class="turno">
                  <header><strong>{{ turno(g.clave) }}</strong><small>{{ horario(g.clave) }}</small></header>
                  <p class="monto">{{ g.total | currency:'PEN':'S/ ' }}</p>
                  <div class="barra"><i [style.width.%]="pct(g.total, t.total)"></i></div>
                  <small>{{ g.ventas }} ventas · {{ pct(g.total, t.total) }}% del total</small>
                </article>
              }
            </section>
            <div class="dos-columnas">
              <section class="tarjeta ancho">
                <h2>Por día y turno</h2>
                <div class="table-wrap">
                  <table class="reporte">
                    <thead><tr><th>Fecha</th><th class="num">Mañana</th><th class="num">Tarde</th>
                      <th class="num">Noche</th><th class="num">Total</th></tr></thead>
                    <tbody>
                      @for (d of t.porDia; track d.fecha) {
                        <tr><td>{{ d.fecha | date:'EEE dd/MM' }}</td>
                          <td class="num">{{ d.manana | currency:'PEN':'S/ ' }}</td>
                          <td class="num">{{ d.tarde | currency:'PEN':'S/ ' }}</td>
                          <td class="num">{{ d.noche | currency:'PEN':'S/ ' }}</td>
                          <td class="num"><strong>{{ d.total | currency:'PEN':'S/ ' }}</strong></td></tr>
                      } @empty {
                        <tr><td colspan="5" class="vacio">Sin ventas confirmadas en el período.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
              <section class="tarjeta">
                <h2>Por vendedor</h2>
                <ul class="barras">
                  @for (g of t.porVendedor; track g.clave) {
                    <li><div class="fila-barra"><span>{{ g.clave }}</span>
                      <strong>{{ g.total | currency:'PEN':'S/ ' }}</strong></div>
                      <div class="barra"><i [style.width.%]="pct(g.total, t.total)"></i></div>
                      <small class="sub">{{ g.ventas }} ventas</small></li>
                  } @empty { <li class="vacio">Sin ventas.</li> }
                </ul>
                <h2>Por método de pago</h2>
                <ul class="barras">
                  @for (g of t.porMetodoPago; track g.clave) {
                    <li><div class="fila-barra"><span>{{ metodo(g.clave) }}</span>
                      <strong>{{ g.total | currency:'PEN':'S/ ' }}</strong></div>
                      <div class="barra"><i [style.width.%]="pct(g.total, t.total)"></i></div></li>
                  } @empty { <li class="vacio">Sin ventas.</li> }
                </ul>
              </section>
            </div>
          } @else {
            <p class="vacio-grande">Elige un período y pulsa «Generar reporte».</p>
          }
        }
      }
    </div>
  `,
  styles: `
    .acciones { display: flex; gap: 8px; flex-wrap: wrap; }
    .filtros, .tarjeta { margin-bottom: 20px; padding: 18px 20px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius); background: #fff; }
    .tipos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .tipos button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius-sm); background: var(--kipu-surface-high); color: var(--kipu-ink); cursor: pointer;
      font: 600 13px "Inter", sans-serif; }
    .tipos button.activo { background: var(--kipu-primary-container); border-color: var(--kipu-primary-container); color: #fff; }
    .tipos mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .campos { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
    .campos label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; color: var(--kipu-muted); }
    .campos .producto { flex: 1 1 280px; }
    .campos input, .campos select { height: 40px; padding: 0 10px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius-sm); background: var(--kipu-surface-high); font: 14px "Inter", sans-serif; }
    .generar { height: 40px; }
    .nota { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; color: var(--kipu-soft); font-size: 13px; }
    .nota mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .kpi-grid { margin-bottom: 20px; }
    .cabecera-tabla { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    h2 { margin: 0 0 6px; font-size: 18px; }
    .tarjeta h2 + .barras { margin-bottom: 18px; }
    .sub { display: block; color: var(--kipu-soft); font-size: 12px; }
    .reporte { width: 100%; border-collapse: collapse; font-size: 13px; }
    .reporte th { padding: 8px 10px; border-bottom: 2px solid var(--kipu-line); color: var(--kipu-soft); font-size: 11px;
      text-align: left; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
    .reporte td { padding: 8px 10px; border-bottom: 1px solid var(--kipu-line); vertical-align: top; }
    .reporte .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .reporte tr.baja td { color: var(--kipu-danger-fg); background: var(--kipu-danger-bg); }
    .reporte tr.inicial td { background: var(--kipu-surface-high); }
    .reporte tfoot td { padding: 10px; font-weight: 700; border-top: 2px solid var(--kipu-line); }
    .vacio { padding: 18px; color: var(--kipu-soft); text-align: center; }
    .vacio-grande { padding: 40px; color: var(--kipu-soft); text-align: center; border: 1px dashed var(--kipu-line);
      border-radius: var(--kipu-radius); }
    .dos-columnas { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr); gap: 20px; align-items: start; }
    .dos-columnas .ancho { order: 0; }
    .turnos ~ .dos-columnas { grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); }
    .barras { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .fila-barra { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
    .barra { height: 6px; margin-top: 4px; border-radius: 3px; background: var(--kipu-surface-high); overflow: hidden; }
    .barra i { display: block; height: 100%; background: var(--kipu-primary-container); }
    .turnos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
    .turno { padding: 16px 18px; border: 1px solid var(--kipu-line); border-top: 3px solid var(--kipu-ochre);
      border-radius: var(--kipu-radius); background: #fff; }
    .turno header { display: flex; justify-content: space-between; align-items: baseline; }
    .turno small { color: var(--kipu-soft); }
    .monto { margin: 8px 0 4px; font: 600 24px "Space Grotesk", sans-serif; }
    .encabezado-impresion { margin-bottom: 12px; font-size: 12px; }
    @media (max-width: 1000px) { .dos-columnas, .turnos ~ .dos-columnas { grid-template-columns: 1fr; } .turnos { grid-template-columns: 1fr; } }
    @media print { .tarjeta, .turno { border-color: #ccc; } .dos-columnas { grid-template-columns: 1fr 2fr; } }
  `
})
export class ReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private productoService = inject(ProductoService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly tolerada = TASA_MERMA_TOLERADA;
  tipos = computed(() => TIPOS.filter(t => this.authService.hasPermission(t.permiso)));
  tipo = signal<TipoReporte>('kardex');
  productos = signal<Producto[]>([]);
  productoId = signal<number | null>(null);
  desde = signal(rangoDelMes().desde);
  hasta = signal(rangoDelMes().hasta);
  cargando = signal(false);
  generadoEn = signal(new Date());

  kardex = signal<KardexValorizado | null>(null);
  mermas = signal<ReporteMermas | null>(null);
  turnos = signal<ReporteVentasTurno | null>(null);

  farmacia = computed(() => this.authService.usuario()?.farmaciaNombre ?? 'KipuSalud');
  usuario = computed(() => this.authService.usuario()?.username ?? '');
  tituloActual = computed(() => TIPOS.find(t => t.valor === this.tipo())?.etiqueta ?? 'Reporte');
  puedeGenerar = computed(() => !!this.desde() && !!this.hasta() && this.desde() <= this.hasta()
    && (this.tipo() !== 'kardex' || !!this.productoId()));
  hayResultado = computed(() => {
    switch (this.tipo()) {
      case 'kardex': return !!this.kardex();
      case 'mermas': return !!this.mermas();
      default: return !!this.turnos();
    }
  });

  readonly hayTexto = (v: string | null) => !!v;

  ngOnInit() {
    const pedido = this.route.snapshot.queryParamMap.get('tipo') as TipoReporte | null;
    const disponibles = this.tipos().map(t => t.valor);
    this.tipo.set(pedido && disponibles.includes(pedido) ? pedido : disponibles[0] ?? 'kardex');
    const producto = Number(this.route.snapshot.queryParamMap.get('producto'));
    if (producto) this.productoId.set(producto);
    if (this.authService.hasPermission('CATALOGO:VER')) {
      this.productoService.listar().subscribe({
        next: productos => this.productos.set(productos),
        error: err => console.error('No se pudieron cargar los productos para el Kardex.', err)
      });
    }
    if (this.tipo() !== 'kardex' || this.productoId()) this.generar();
  }

  cambiarTipo(tipo: TipoReporte) {
    this.tipo.set(tipo);
    this.router.navigate([], { queryParams: { tipo }, replaceUrl: true });
    if (!this.hayResultado() && this.puedeGenerar()) this.generar();
  }

  generar() {
    if (!this.puedeGenerar() || this.cargando()) return;
    this.cargando.set(true);
    const fin = () => { this.cargando.set(false); this.generadoEn.set(new Date()); };
    const error = () => this.cargando.set(false);
    switch (this.tipo()) {
      case 'kardex':
        this.reporteService.kardex(this.productoId()!, this.desde(), this.hasta())
          .subscribe({ next: r => { this.kardex.set(r); fin(); }, error });
        break;
      case 'mermas':
        this.reporteService.mermas(this.desde(), this.hasta())
          .subscribe({ next: r => { this.mermas.set(r); fin(); }, error });
        break;
      default:
        this.reporteService.ventasPorTurno(this.desde(), this.hasta())
          .subscribe({ next: r => { this.turnos.set(r); fin(); }, error });
    }
  }

  imprimir() {
    window.print();
  }

  exportarExcel() {
    const periodo = `${this.desde()}_${this.hasta()}`;
    const k = this.kardex();
    const m = this.mermas();
    const t = this.turnos();
    if (this.tipo() === 'kardex' && k) {
      const filas: CeldaXlsx[][] = [
        ['Fecha', 'Comprobante / guía', 'Movimiento', 'Lote', 'Vencimiento', 'Entrada', 'Salida', 'Saldo físico',
          'Costo unitario', 'Saldo valorizado', 'Responsable'],
        [k.desde, 'Saldo inicial', '', '', '', null, null, k.saldoInicialUnidades, null, k.saldoInicialValor, ''],
        ...k.filas.map(f => [f.fecha.replace('T', ' ').slice(0, 16),
          f.tipo === 'AJUSTE' ? this.motivo(f.referencia) : f.referencia, this.tipoMovimiento(f.tipo),
          f.codigoLote, f.fechaVencimiento, f.entrada || null, f.salida || null, f.saldoUnidades, f.costoUnitario,
          f.saldoValor, f.actor]),
        [k.hasta, 'Saldo final', '', '', '', k.totalEntradas, k.totalSalidas, k.saldoFinalUnidades, k.costoPromedio,
          k.saldoFinalValor, '']
      ];
      descargarXlsx(`kardex-${this.nombreArchivo(k.producto)}-${periodo}.xlsx`, [
        { nombre: 'Kardex valorizado', filas, anchos: [17, 24, 20, 14, 12, 9, 9, 12, 13, 15, 16] }
      ]);
    } else if (this.tipo() === 'mermas' && m) {
      descargarXlsx(`mermas-${periodo}.xlsx`, [
        { nombre: 'Resumen', filas: [
          ['Indicador', 'Valor'],
          ['Unidades dadas de baja', m.unidadesMerma], ['Valor de la merma (S/)', m.valorMerma],
          ['Unidades vendidas', m.unidadesVendidas], ['Tasa de merma (%)', m.tasaMerma],
          [], ['Motivo', 'Unidades', 'Valor (S/)'],
          ...m.porMotivo.map(g => [this.motivo(g.motivo), g.unidades, g.valor])
        ], anchos: [28, 12, 12] },
        { nombre: 'Detalle', filas: [
          ['Fecha', 'Producto', 'Lote', 'Vencimiento', 'Motivo', 'Observación', 'Cantidad', 'Costo unitario', 'Valor', 'Responsable'],
          ...m.filas.map(f => [f.fecha.replace('T', ' ').slice(0, 16), f.producto, f.codigoLote, f.fechaVencimiento,
            this.motivo(f.motivo), f.observacion, f.cantidad, f.costoUnitario, f.valor, f.actor])
        ], anchos: [17, 30, 14, 12, 22, 30, 9, 12, 10, 16] }
      ]);
    } else if (t) {
      descargarXlsx(`ventas-por-turno-${periodo}.xlsx`, [
        { nombre: 'Por turno', filas: [
          ['Turno', 'Horario', 'Ventas', 'Total (S/)', 'Participación (%)'],
          ...t.porTurno.map(g => [this.turno(g.clave), this.horario(g.clave), g.ventas, g.total, this.pct(g.total, t.total)]),
          ['Total', '', t.ventas, t.total, 100]
        ], anchos: [12, 16, 10, 12, 16] },
        { nombre: 'Por día', filas: [
          ['Fecha', 'Mañana', 'Tarde', 'Noche', 'Total'],
          ...t.porDia.map(d => [d.fecha, d.manana, d.tarde, d.noche, d.total])
        ], anchos: [12, 12, 12, 12, 12] },
        { nombre: 'Por vendedor', filas: [['Vendedor', 'Ventas', 'Total (S/)'],
          ...t.porVendedor.map(g => [g.clave, g.ventas, g.total])], anchos: [24, 10, 12] },
        { nombre: 'Por método de pago', filas: [['Método', 'Ventas', 'Total (S/)'],
          ...t.porMetodoPago.map(g => [this.metodo(g.clave), g.ventas, g.total])], anchos: [18, 10, 12] }
      ]);
    }
  }

  pct(parte: number, total: number) { return participacion(Number(parte), Number(total)); }
  motivo(valor: string) { return MOTIVOS_AJUSTE.find(m => m.valor === valor)?.etiqueta ?? valor; }
  tipoMovimiento(tipo: string) { return TIPOS_MOVIMIENTO[tipo] ?? tipo; }
  turno(clave: string) { return etiquetaTurno(clave); }
  horario(clave: string) { return HORARIO_TURNO[clave as keyof typeof HORARIO_TURNO] ?? ''; }
  metodo(clave: string) { return METODOS[clave] ?? clave; }

  private nombreArchivo(texto: string) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 40) || 'producto';
  }
}
