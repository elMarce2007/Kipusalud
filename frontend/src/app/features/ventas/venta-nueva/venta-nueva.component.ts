import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe } from '@angular/common';

import { ClienteService } from '../../../services/cliente.service';
import { ProductoService } from '../../../services/producto.service';
import { VentaService } from '../../../services/venta.service';
import { FacturacionService } from '../../../services/facturacion.service';
import { AuthService } from '../../../services/auth.service';
import { Cliente, clienteFacturable } from '../../../models/cliente.model';
import { Producto } from '../../../models/producto.model';
import { DetalleVenta, MetodoPago, TIPOS_COMPROBANTE, TipoComprobante, Venta } from '../../../models/venta.model';
import { OpcionesComprobante } from '../../../models/facturacion.model';
import { createIdempotencyKey } from '../../../core/utils/idempotency-key';
import { etiquetaRol } from '../../../core/utils/roles';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

export { clienteFacturable } from '../../../models/cliente.model';

/** Línea del despacho con los datos del producto necesarios para calcular el IGV. */
interface LineaDespacho extends DetalleVenta {
  descripcion?: string;
  stock: number;
}

export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string; icono: string }[] = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo', icono: 'payments' },
  { valor: 'YAPE', etiqueta: 'Yape', icono: 'qr_code_2' },
  { valor: 'PLIN', etiqueta: 'Plin', icono: 'qr_code_2' },
  { valor: 'TARJETA', etiqueta: 'Tarjeta', icono: 'credit_card' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia', icono: 'account_balance' }
];

const IGV = 0.18;
const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Importe cobrado por una línea, igual que el backend: si el producto es gravado (10) y
 * su precio no incluye IGV, se le suma el 18 %.
 */
export function importeLinea(precio: number, cantidad: number, afectacion?: string | null,
                             precioIncluyeIgv?: boolean | null): number {
  const base = precio * cantidad;
  return redondear(afectacion === '10' && precioIncluyeIgv === false ? base * (1 + IGV) : base);
}

/** Montos rápidos de efectivo: exacto y los billetes siguientes que cubren el total. */
export function montosRapidos(total: number): number[] {
  if (total <= 0) return [];
  const exacto = redondear(total);
  const billetes = [10, 20, 50, 100, 200].filter(b => b > exacto).slice(0, 3);
  return [exacto, ...billetes];
}

@Component({
  selector: 'app-venta-nueva',
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule,
    PageHeaderComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header titulo="Ventas de mostrador y despacho" insignia="FEFO activo"
                       [migas]="[{ etiqueta: 'Ventas', ruta: '/ventas' }, { etiqueta: 'Nueva venta' }]">
        <div class="caja">
          <mat-icon>point_of_sale</mat-icon>
          <span><strong>{{ usuario() }}</strong><small>{{ rol() }}</small></span>
        </div>
      </app-page-header>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
        </div>
      }

      <div class="pos-grid">
        <div class="pos-main">
          <section class="panel">
            <label class="buscador">
              <mat-icon>search</mat-icon>
              <input #buscador type="search" autocomplete="off" aria-label="Buscar medicamento"
                     placeholder="Escribe el nombre del medicamento o su descripción…"
                     [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
                     (keydown.enter)="agregarPrimerResultado($event)">
              <kbd>F2</kbd>
            </label>
            @if (busqueda().trim()) {
              <ul class="resultados" role="listbox" aria-label="Resultados de la búsqueda">
                @for (p of resultados(); track p.id) {
                  <li>
                    <button type="button" (click)="agregar(p)" [disabled]="p.stock <= 0">
                      <span><strong>{{ p.nombre }}</strong><small>{{ p.descripcion }}</small></span>
                      <span class="num">{{ p.precio | currency:'PEN':'S/ ' }}</span>
                      <span class="chip" [class.ok]="p.stock > 0" [class.danger]="p.stock <= 0">{{ p.stock }} disp.</span>
                    </button>
                  </li>
                } @empty {
                  <li class="vacio">No hay productos que coincidan.</li>
                }
              </ul>
            } @else if (rapidos().length) {
              <div class="rapidos-cabecera">
                <span class="kpi-label">Productos de alta rotación</span>
                <span class="tiempo-real">Stock en tiempo real</span>
              </div>
              <div class="rapidos">
                @for (p of rapidos(); track p.id) {
                  <button type="button" class="rapido" (click)="agregar(p)" [disabled]="p.stock <= 0">
                    <strong>{{ p.nombre }}</strong>
                    <small>{{ p.descripcion }}</small>
                    <span class="rapido-pie">
                      <span class="precio">{{ p.precio | currency:'PEN':'S/ ' }}</span>
                      <span class="chip" [class.ok]="p.stock > 10" [class.warn]="p.stock > 0 && p.stock <= 10"
                            [class.danger]="p.stock <= 0">{{ p.stock }} disp.</span>
                    </span>
                  </button>
                }
              </div>
            }
          </section>

          <section class="panel despacho">
            <header class="despacho-cabecera">
              <h2><mat-icon>receipt_long</mat-icon> Detalle de medicamentos en despacho</h2>
              <span class="chip">{{ unidades() }} {{ unidades() === 1 ? 'unidad' : 'unidades' }}</span>
              <span class="spacer"></span>
              @if (detalles().length) {
                <button mat-button type="button" (click)="vaciar()"><mat-icon>remove_shopping_cart</mat-icon> Vaciar</button>
              }
            </header>
            <div class="table-wrap">
              <table class="tabla-despacho">
                <thead>
                  <tr><th>Fármaco y presentación</th><th>Cant.</th><th class="num">P. unit</th><th class="num">Subtotal</th><th></th></tr>
                </thead>
                <tbody>
                  @for (d of detalles(); track d.productoId; let i = $index) {
                    <tr>
                      <td><strong>{{ d.productoNombre }}</strong>@if (d.descripcion) { <small>{{ d.descripcion }}</small> }</td>
                      <td>
                        <div class="stepper">
                          <button type="button" aria-label="Quitar una unidad" (click)="cambiarCantidad(i, -1)">−</button>
                          <span class="num">{{ d.cantidad }}</span>
                          <button type="button" aria-label="Agregar una unidad" (click)="cambiarCantidad(i, 1)"
                                  [disabled]="d.cantidad >= d.stock">+</button>
                        </div>
                      </td>
                      <td class="num">{{ d.precioUnitario | currency:'PEN':'S/ ' }}</td>
                      <td class="num"><strong>{{ d.subtotal | currency:'PEN':'S/ ' }}</strong></td>
                      <td><button mat-icon-button type="button" aria-label="Eliminar fila" (click)="eliminarDetalle(i)"><mat-icon>close</mat-icon></button></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="vacio">Busca un medicamento o toca un producto de alta rotación para agregarlo.</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="atajos"><span><kbd>F2</kbd> Buscar</span><span><kbd>F10</kbd> Registrar venta</span>
              <span>El lote se asigna por FEFO al confirmar.</span></footer>
          </section>
        </div>

        <aside class="pos-lateral">
          <section class="panel">
            <h3 class="kpi-label">Comprobante de pago</h3>
            <mat-radio-group class="tipos-comprobante" aria-label="Tipo de comprobante"
                             [value]="tipoComprobante()" (change)="cambiarTipoComprobante($event.value)">
              <mat-radio-button value="BOLETA_INTERNA">
                <span class="tipo-titulo">Boleta</span>
                <span class="tipo-ayuda">Comprobante simple de la farmacia. No se envía a SUNAT.</span>
              </mat-radio-button>
              <mat-radio-button value="BOLETA_ELECTRONICA" [disabled]="!opciones()?.boletaElectronicaDisponible">
                <span class="tipo-titulo">Boleta electrónica</span>
                <span class="tipo-ayuda">Se envía a SUNAT. Desde S/ {{ montoMinimoConDocumento() }} requiere el DNI del cliente.</span>
              </mat-radio-button>
              <mat-radio-button value="FACTURA" [disabled]="!opciones()?.facturaDisponible">
                <span class="tipo-titulo">Factura</span>
                <span class="tipo-ayuda">A nombre de una empresa con RUC. Se envía a SUNAT.</span>
              </mat-radio-button>
            </mat-radio-group>
            @if (opciones() && !opciones()!.facturaDisponible && opciones()!.motivoNoDisponible) {
              <p class="nota" role="note">{{ opciones()!.motivoNoDisponible }}</p>
            }

            <h3 class="kpi-label">Datos del adquiriente</h3>
            @if (tipoComprobante() === 'FACTURA') {
              <label class="campo">
                <span>Buscar empresa por razón social o RUC</span>
                <input type="search" [value]="busquedaEmpresa()" (input)="busquedaEmpresa.set($any($event.target).value)">
              </label>
              <label class="campo">
                <span>Empresa</span>
                <select [value]="clienteSeleccionado()?.id ?? ''" (change)="seleccionarClientePorId($any($event.target).value)">
                  <option value="">Selecciona la empresa…</option>
                  @for (e of empresasFiltradas(); track e.id) {
                    <option [value]="e.id">{{ e.razonSocial }} · RUC {{ e.ruc }}</option>
                  }
                </select>
              </label>
              <a mat-button routerLink="/clientes/nuevo"><mat-icon>add_business</mat-icon> Registrar empresa como cliente</a>
            } @else {
              <label class="campo">
                <span>Cliente</span>
                <select [value]="clienteSeleccionado()?.id ?? ''" (change)="seleccionarClientePorId($any($event.target).value)">
                  <option value="">Público general (sin identificar)</option>
                  @for (c of clientes(); track c.id) {
                    <option [value]="c.id">{{ c.nombres }} {{ c.apellidos }} · DNI {{ c.dni }}</option>
                  }
                </select>
              </label>
            }
            @if (requisitoPendiente()) {
              <p class="requisito" role="alert">{{ requisitoPendiente() }}</p>
            }
          </section>

          <section class="panel">
            <h3 class="liquidacion-titulo">Liquidación de mostrador</h3>
            <dl class="liquidacion">
              <dt>Subtotal fármacos</dt><dd class="num">{{ total() | currency:'PEN':'S/ ' }}</dd>
              <dt>IGV (incluido en el precio)</dt><dd class="num">{{ igv() | currency:'PEN':'S/ ' }}</dd>
            </dl>
            <div class="total-pagar">
              <span class="kpi-label">Total a pagar<small>Soles (PEN)</small></span>
              <strong class="num">{{ total() | currency:'PEN':'S/ ' }}</strong>
            </div>

            <h3 class="kpi-label">Forma de pago</h3>
            <div class="metodos" role="radiogroup" aria-label="Forma de pago">
              @for (m of metodos; track m.valor) {
                <button type="button" role="radio" class="metodo" [class.activo]="metodoPago() === m.valor"
                        [attr.aria-checked]="metodoPago() === m.valor" (click)="cambiarMetodoPago(m.valor)">
                  <mat-icon>{{ m.icono }}</mat-icon>{{ m.etiqueta }}
                </button>
              }
            </div>

            @if (metodoPago() === 'EFECTIVO') {
              <div class="efectivo">
                <label class="monto">
                  <span>Monto recibido S/</span>
                  <input type="number" min="0" step="0.10" class="num" [value]="montoRecibido() || ''"
                         (input)="actualizarMonto($event)" aria-label="Monto recibido">
                </label>
                <div class="montos-rapidos">
                  @for (m of rapidosEfectivo(); track m; let primero = $first) {
                    <button type="button" (click)="fijarMonto(m)" [class.exacto]="primero">
                      {{ primero ? 'Exacto' : 'S/ ' + m }}
                    </button>
                  }
                </div>
                <div class="vuelto"><span>Vuelto a entregar</span><strong class="num">{{ vuelto() | currency:'PEN':'S/ ' }}</strong></div>
              </div>
            } @else {
              <mat-checkbox [checked]="pagoExternoVerificado()" (change)="cambiarConfirmacionPagoExterno($event.checked)">
                Confirmo que verifiqué el pago fuera de KipuSalud
              </mat-checkbox>
            }

            <button type="button" class="registrar" (click)="confirmarVenta()" [disabled]="!puedeConfirmar()">
              <mat-icon>verified</mat-icon>
              <span>Registrar venta con {{ etiquetaComprobante() }} <kbd>F10</kbd></span>
            </button>
            <p class="nota centro">
              @switch (tipoComprobante()) {
                @case ('BOLETA_INTERNA') { Se emitirá una boleta interna numerada (serie I001). }
                @case ('BOLETA_ELECTRONICA') { Se emitirá una boleta electrónica y se enviará a SUNAT. }
                @case ('FACTURA') { Se emitirá una factura electrónica y se enviará a SUNAT. }
              }
            </p>
            <button mat-button type="button" class="cancelar" (click)="cancelar()">Cancelar</button>
          </section>
        </aside>
      </div>
    </div>
  `,
  styles: `
    .caja { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius); background: #fff; }
    .caja mat-icon { color: var(--kipu-primary); }
    .caja span { display: flex; flex-direction: column; line-height: 1.2; }
    .caja small { color: var(--kipu-soft); font-size: 12px; }
    .pos-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(320px, 1fr); gap: 20px; align-items: start; }
    .pos-main, .pos-lateral { display: grid; gap: 20px; min-width: 0; }
    .panel { padding: 18px 20px; border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius); background: #fff;
      box-shadow: 0 1px 3px rgba(41, 39, 31, .04); }
    .buscador { display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 14px;
      border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius-sm); background: var(--kipu-paper); }
    .buscador:focus-within { border-color: var(--kipu-ink); }
    .buscador input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 15px; }
    .buscador mat-icon { color: var(--kipu-soft); }
    kbd { padding: 2px 6px; border: 1px solid var(--kipu-line); border-radius: 4px; background: var(--kipu-surface-high);
      font: 600 11px "Space Grotesk", sans-serif; }
    .resultados { list-style: none; margin: 10px 0 0; padding: 0; border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius-sm); }
    .resultados li + li { border-top: 1px solid var(--kipu-line); }
    .resultados button { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; width: 100%;
      padding: 10px 12px; border: 0; background: #fff; text-align: left; cursor: pointer; }
    .resultados button:hover:not(:disabled) { background: #fdfbf7; }
    .resultados button:disabled { opacity: .55; cursor: not-allowed; }
    .resultados small, .tabla-despacho small, .rapido small { display: block; color: var(--kipu-soft); font-size: 12px; }
    .vacio { padding: 14px; color: var(--kipu-soft); text-align: center; }
    .rapidos-cabecera { display: flex; justify-content: space-between; margin: 16px 0 8px; }
    .tiempo-real { color: var(--kipu-ok-fg); font-size: 12px; font-weight: 600; }
    .rapidos { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .rapido { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 10px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius-sm); background: var(--kipu-paper); text-align: left; cursor: pointer; }
    .rapido:hover:not(:disabled) { border-color: var(--kipu-primary-container); }
    .rapido:disabled { opacity: .55; cursor: not-allowed; }
    .rapido strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rapido small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rapido-pie { display: flex; justify-content: space-between; align-items: end; gap: 6px; margin-top: 8px; }
    .precio { color: var(--kipu-primary); font: 600 18px "Space Grotesk", sans-serif; }
    .despacho { padding: 0; overflow: hidden; }
    .despacho-cabecera { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: var(--kipu-paper);
      border-bottom: 1px solid var(--kipu-line); }
    .despacho-cabecera h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 17px; }
    .despacho-cabecera h2 mat-icon { color: var(--kipu-primary); }
    .tabla-despacho { width: 100%; border-collapse: collapse; }
    .tabla-despacho th { padding: 10px 12px; border-bottom: 2px solid var(--kipu-line); color: var(--kipu-soft);
      font-size: 11px; font-weight: 600; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
    .tabla-despacho td { padding: 12px; border-bottom: 1px solid var(--kipu-line); vertical-align: middle; }
    .tabla-despacho .num { text-align: right; }
    .stepper { display: inline-flex; align-items: center; gap: 4px; padding: 2px; border-radius: var(--kipu-radius-sm);
      background: var(--kipu-surface-high); }
    .stepper button { width: 28px; height: 28px; border: 0; border-radius: 4px; background: transparent; font-size: 18px; cursor: pointer; }
    .stepper button:hover:not(:disabled) { background: #fff; }
    .stepper button:disabled { opacity: .4; cursor: not-allowed; }
    .stepper span { min-width: 28px; text-align: center; font-weight: 600; }
    .atajos { display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 20px; background: var(--kipu-paper);
      color: var(--kipu-soft); font-size: 12px; }
    .kpi-label { display: block; margin: 0 0 8px; color: var(--kipu-soft); font-size: 11px; font-weight: 600;
      letter-spacing: .08em; text-transform: uppercase; }
    .kpi-label small { display: block; letter-spacing: 0; text-transform: none; font-weight: 500; }
    .tipos-comprobante { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .tipo-titulo { display: block; font-weight: 600; }
    .tipo-ayuda { display: block; font-size: 12px; color: var(--kipu-soft); }
    .campo { display: grid; gap: 4px; margin-bottom: 10px; font-size: 12px; color: var(--kipu-soft); }
    .campo input, .campo select { height: 40px; padding: 0 10px; border: 1px solid var(--kipu-line);
      border-radius: var(--kipu-radius-sm); background: #fff; color: var(--kipu-ink); font-size: 14px; }
    .campo input:focus, .campo select:focus { outline: 1px solid var(--kipu-ink); }
    .nota { font-size: 12px; color: var(--kipu-soft); margin: 0 0 12px; }
    .nota.centro { margin: 8px 0 0; text-align: center; }
    .requisito { color: var(--kipu-warn-fg); background: var(--kipu-warn-bg); border: 1px solid var(--kipu-warn-border);
      padding: 8px 12px; border-radius: var(--kipu-radius-sm); margin: 4px 0 0; font-size: 13px; }
    .liquidacion-titulo { margin: 0 0 12px; font-size: 18px; }
    .liquidacion { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 0 0 12px; }
    .liquidacion dt { color: var(--kipu-muted); }
    .liquidacion dd { margin: 0; }
    .total-pagar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px;
      padding: 14px 16px; border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius); background: var(--kipu-paper); }
    .total-pagar .kpi-label { margin: 0; }
    .total-pagar strong { color: var(--kipu-primary); font-size: clamp(28px, 3vw, 38px); line-height: 1; }
    .metodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .metodo { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px;
      border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius-sm); background: var(--kipu-paper);
      color: var(--kipu-ink); font-size: 12px; font-weight: 600; cursor: pointer; }
    .metodo.activo { border-color: var(--kipu-primary-container); background: var(--kipu-primary-container); color: #fff; }
    .efectivo { padding: 12px; border-radius: var(--kipu-radius); background: var(--kipu-paper); border: 1px solid var(--kipu-line); }
    .monto { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-weight: 600; }
    .monto input { width: 130px; height: 44px; padding: 0 10px; border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius-sm);
      background: #fff; font-size: 22px; text-align: right; }
    .montos-rapidos { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; margin: 8px 0; }
    .montos-rapidos button { padding: 4px 10px; border: 1px solid var(--kipu-line); border-radius: var(--kipu-radius-sm);
      background: #fff; font: 600 13px "Space Grotesk", sans-serif; cursor: pointer; }
    .montos-rapidos button.exacto { background: var(--kipu-ok-bg); color: var(--kipu-ok-fg); border-color: var(--kipu-ok-border); }
    .vuelto { display: flex; justify-content: space-between; align-items: baseline; font-weight: 600; }
    .vuelto strong { color: var(--kipu-ok-fg); font-size: 26px; }
    .registrar { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 60px; margin-top: 16px;
      border: 0; border-radius: var(--kipu-radius-sm); background: var(--kipu-primary); color: #fff;
      font: 600 17px "Space Grotesk", sans-serif; cursor: pointer; }
    .registrar:hover:not(:disabled) { background: var(--kipu-primary-dark); }
    .registrar:disabled { opacity: .5; cursor: not-allowed; }
    .registrar kbd { color: var(--kipu-ink); }
    .cancelar { display: block; margin: 6px auto 0; }
    @media (max-width: 1100px) { .pos-grid { grid-template-columns: 1fr; } }
  `
})
export class VentaNuevaComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private productoService = inject(ProductoService);
  private ventaService = inject(VentaService);
  private facturacionService = inject(FacturacionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;

  readonly metodos = METODOS_PAGO;
  usuario = computed(() => this.authService.usuario()?.username ?? '');
  rol = computed(() => etiquetaRol(this.authService.usuario()?.rol));

  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  ventasRecientes = signal<Venta[]>([]);
  detalles = signal<LineaDespacho[]>([]);
  loadError = signal<string | null>(null);
  clienteSeleccionado = signal<Cliente | null>(null);
  private pendingVentaKey: string | null = null;
  loading = signal(false);
  metodoPago = signal<MetodoPago>('EFECTIVO');
  montoRecibido = signal(0);
  pagoExternoVerificado = signal(false);
  tipoComprobante = signal<TipoComprobante>('BOLETA_INTERNA');
  opciones = signal<OpcionesComprobante | null>(null);
  busquedaEmpresa = signal('');
  busqueda = signal('');

  montoMinimoConDocumento = computed(() => this.opciones()?.montoMinimoBoletaConDocumento ?? 700);
  etiquetaComprobante = computed(() => TIPOS_COMPROBANTE[this.tipoComprobante()].toLowerCase());

  /** Clientes con datos completos para recibir factura. */
  empresas = computed(() => this.clientes().filter(c => clienteFacturable(c)));
  empresasFiltradas = computed(() => {
    const texto = this.busquedaEmpresa().trim().toLowerCase();
    return this.empresas().filter(e => !texto
      || (e.razonSocial ?? '').toLowerCase().includes(texto)
      || (e.ruc ?? '').includes(texto));
  });

  resultados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return texto ? this.productos()
      .filter(p => `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(texto))
      .slice(0, 8) : [];
  });

  /** Los seis productos con stock más vendidos en las ventas cargadas (o los primeros con stock). */
  rapidos = computed(() => {
    const vendidos = new Map<number, number>();
    for (const v of this.ventasRecientes()) {
      if (v.estado !== 'CONFIRMADA') continue;
      for (const d of v.detalles) vendidos.set(d.productoId, (vendidos.get(d.productoId) ?? 0) + d.cantidad);
    }
    return [...this.productos()]
      .filter(p => p.stock > 0)
      .sort((a, b) => (vendidos.get(b.id!) ?? 0) - (vendidos.get(a.id!) ?? 0) || a.nombre.localeCompare(b.nombre))
      .slice(0, 6);
  });

  /** Qué le falta a la venta para el comprobante elegido; null si nada. */
  requisitoPendiente = computed((): string | null => {
    const cliente = this.clienteSeleccionado();
    switch (this.tipoComprobante()) {
      case 'FACTURA':
        return cliente && clienteFacturable(cliente)
          ? null : 'Selecciona la empresa que recibirá la factura.';
      case 'BOLETA_ELECTRONICA':
        return this.total() >= this.montoMinimoConDocumento() && !/^\d{8}$/.test(cliente?.dni ?? '')
          ? `Desde S/ ${this.montoMinimoConDocumento()} la boleta electrónica requiere un cliente con DNI.`
          : null;
      default:
        return null;
    }
  });

  total = computed(() => redondear(this.detalles().reduce((sum, d) => sum + d.subtotal, 0)));
  igv = computed(() => redondear(this.detalles()
    .filter(d => d.afectacionIgv === '10')
    .reduce((sum, d) => sum + d.subtotal - d.subtotal / (1 + IGV), 0)));
  unidades = computed(() => this.detalles().reduce((sum, d) => sum + d.cantidad, 0));
  vuelto = computed(() => Math.max(0, redondear(this.montoRecibido() - this.total())));
  rapidosEfectivo = computed(() => montosRapidos(this.total()));
  puedeConfirmar = computed(() => !this.requisitoPendiente()
    && this.detalles().length > 0
    && !this.loading()
    && (this.metodoPago() === 'EFECTIVO'
      ? this.montoRecibido() >= this.total()
      : this.pagoExternoVerificado()));

  @HostListener('document:keydown', ['$event'])
  atajos(event: KeyboardEvent) {
    if (event.key === 'F2') {
      event.preventDefault();
      this.buscador?.nativeElement.focus();
    } else if (event.key === 'F10') {
      event.preventDefault();
      this.confirmarVenta();
    }
  }

  ngOnInit() {
    this.loadError.set(null);
    this.facturacionService.obtenerOpciones().subscribe({
      next: opciones => this.opciones.set(opciones),
      // Sin opciones solo queda la boleta interna, que siempre está disponible.
      error: err => console.error('No se pudieron consultar los comprobantes disponibles.', err)
    });
    this.clienteService.listar().subscribe({
      next: data => {
        this.clientes.set(data);
        const clienteId = Number(this.route.snapshot.queryParamMap.get('clienteId'));
        if (Number.isSafeInteger(clienteId) && clienteId > 0) {
          this.clienteSeleccionado.set(data.find(cliente => cliente.id === clienteId) ?? null);
        }
      },
      error: err => {
        console.error('No se pudieron cargar los clientes para la venta.', err);
        this.loadError.set('No se pudieron cargar los datos de clientes. No se puede registrar una venta.');
      }
    });
    this.productoService.listar().subscribe({
      next: data => this.productos.set(data),
      error: err => {
        console.error('No se pudieron cargar los productos para la venta.', err);
        this.loadError.set('No se pudieron cargar los productos. No se puede registrar una venta.');
      }
    });
    // Solo sirve para ordenar los productos rápidos; si falla, se muestran por nombre.
    this.ventaService.listar().subscribe({
      next: ventas => this.ventasRecientes.set(ventas.slice(0, 200)),
      error: err => console.error('No se pudieron cargar las ventas recientes.', err)
    });
  }

  agregarPrimerResultado(event: Event) {
    event.preventDefault();
    const primero = this.resultados().find(p => p.stock > 0);
    if (primero) this.agregar(primero);
  }

  /** Agrega una unidad del producto o suma una a su línea si ya está en el despacho. */
  agregar(producto: Producto) {
    const indice = this.detalles().findIndex(d => d.productoId === producto.id);
    if (indice >= 0) {
      this.cambiarCantidad(indice, 1);
    } else if (producto.stock > 0) {
      this.detalles.update(arr => [...arr, {
        productoId: producto.id!,
        productoNombre: producto.nombre,
        descripcion: producto.descripcion,
        cantidad: 1,
        precioUnitario: producto.precio,
        subtotal: importeLinea(producto.precio, 1, producto.afectacionIgv, producto.precioIncluyeIgv),
        afectacionIgv: producto.afectacionIgv ?? null,
        precioIncluyeIgv: producto.precioIncluyeIgv ?? null,
        stock: producto.stock
      }]);
      this.pendingVentaKey = null;
    }
    this.busqueda.set('');
  }

  cambiarCantidad(indice: number, delta: number) {
    const linea = this.detalles()[indice];
    if (!linea) return;
    const cantidad = linea.cantidad + delta;
    if (cantidad < 1) {
      this.eliminarDetalle(indice);
      return;
    }
    if (cantidad > linea.stock) {
      this.snackBar.open('Stock insuficiente', 'OK', { duration: 3000 });
      return;
    }
    this.detalles.update(arr => arr.map((d, i) => i === indice ? {
      ...d,
      cantidad,
      subtotal: importeLinea(d.precioUnitario, cantidad, d.afectacionIgv, d.precioIncluyeIgv)
    } : d));
    this.pendingVentaKey = null;
  }

  vaciar() {
    this.detalles.set([]);
    this.pendingVentaKey = null;
  }

  cambiarTipoComprobante(tipo: TipoComprobante): void {
    this.tipoComprobante.set(tipo);
    if (tipo === 'FACTURA' && !clienteFacturable(this.clienteSeleccionado())) {
      this.clienteSeleccionado.set(null);
    }
    this.pendingVentaKey = null;
  }

  seleccionarClientePorId(id: string): void {
    this.seleccionarCliente(this.clientes().find(c => String(c.id) === id) ?? null);
  }

  seleccionarCliente(cliente: Cliente | null): void {
    this.clienteSeleccionado.set(cliente);
    this.pendingVentaKey = null;
  }

  cambiarMetodoPago(metodo: MetodoPago) {
    this.metodoPago.set(metodo);
    this.pagoExternoVerificado.set(false);
    this.montoRecibido.set(0);
    this.pendingVentaKey = null;
  }

  cambiarConfirmacionPagoExterno(confirmado: boolean): void {
    this.pagoExternoVerificado.set(confirmado);
    this.pendingVentaKey = null;
  }

  actualizarMonto(event: Event) {
    const valor = Number((event.target as HTMLInputElement).value);
    this.montoRecibido.set(Number.isFinite(valor) ? Math.max(0, valor) : 0);
    this.pendingVentaKey = null;
  }

  fijarMonto(monto: number) {
    this.montoRecibido.set(monto);
    this.pendingVentaKey = null;
  }

  eliminarDetalle(index: number) {
    this.detalles.update(arr => arr.filter((_, i) => i !== index));
    this.pendingVentaKey = null;
  }

  confirmarVenta() {
    const cliente = this.clienteSeleccionado();
    if (!this.puedeConfirmar()) return;

    this.loading.set(true);
    this.pendingVentaKey ??= createIdempotencyKey();
    const metodoPago = this.metodoPago();
    const venta = {
      claveIdempotencia: this.pendingVentaKey,
      clienteId: cliente?.id ?? null,
      tipoComprobante: this.tipoComprobante(),
      metodoPago,
      montoRecibido: metodoPago === 'EFECTIVO' ? this.montoRecibido() : this.total(),
      confirmacionManualPago: metodoPago !== 'EFECTIVO' && this.pagoExternoVerificado(),
      detalles: this.detalles().map(d => ({
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal
      }))
    };

    this.ventaService.crear(venta).subscribe({
      next: ventaRegistrada => {
        this.pendingVentaKey = null;
        const confirmado = ventaRegistrada.estado === 'CONFIRMADA';
        // Se abre el detalle para imprimir el comprobante o revisar su estado en SUNAT.
        const destino = confirmado && ventaRegistrada.id ? ['/ventas', ventaRegistrada.id] : ['/ventas'];
        this.router.navigate(destino).then(navegado => {
          if (!navegado) {
            console.error('La venta se registró, pero no se pudo abrir Ventas y despacho.');
            this.snackBar.open('Venta registrada, pero no se pudo abrir Ventas y despacho.', 'Cerrar',
              { duration: 5000 });
            return;
          }
          this.snackBar.open(
            confirmado
              ? 'Venta registrada. Ya puedes imprimir el comprobante.'
              : 'Venta registrada, pero sigue pendiente de confirmación en inventario.',
            'Cerrar',
            { duration: 5000 }
          );
        });
      },
      error: err => {
        // El interceptor muestra el motivo según el código HTTP (ver VentaService.crear).
        console.error('No se pudo registrar la venta.', err);
        this.loading.set(false);
      }
    });
  }

  cancelar() {
    this.router.navigate(['/ventas']);
  }
}
