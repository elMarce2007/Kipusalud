import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';

import { VentaService } from '../../../services/venta.service';
import { ClienteService } from '../../../services/cliente.service';
import { ProductoService } from '../../../services/producto.service';
import { FacturacionService } from '../../../services/facturacion.service';
import { AuthService } from '../../../services/auth.service';
import { TIPOS_COMPROBANTE, Venta } from '../../../models/venta.model';
import { Cliente } from '../../../models/cliente.model';
import {
  ComprobanteElectronico,
  ESTADOS_COMPROBANTE,
  EmisorComprobante
} from '../../../models/facturacion.model';
import { calcularTotales, htmlComprobante, imprimirHtml } from './comprobante-impreso';
import { InventarioService } from '../../../services/inventario.service';
import { LotesDeVenta } from '../../../models/inventario.model';

@Component({
  selector: 'app-venta-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Registro de venta</p>
          <h1>{{ titulo() }}</h1>
        </div>
        <div class="acciones-cabecera">
          @if (venta()?.estado === 'CONFIRMADA') {
            <button mat-raised-button color="primary" (click)="imprimir()">
              <mat-icon>print</mat-icon> Imprimir comprobante
            </button>
          }
          <button mat-button (click)="volver()">
            <mat-icon>arrow_back</mat-icon> Volver
          </button>
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
        </div>
      }

      @if (venta()) {
        <mat-card>
          <mat-card-content>
            <div class="venta-info">
              <div class="info-item">
                <strong>Fecha:</strong>
                <span>{{ venta()!.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="info-item">
                <strong>Cliente:</strong>
                <span>{{ nombreCliente() }}</span>
              </div>
              <div class="info-item">
                <strong>Estado:</strong>
                <span>{{ venta()!.estado === 'CONFIRMADA' ? 'Confirmada' : venta()!.estado === 'PENDIENTE_STOCK' ? 'Pendiente de stock' : (venta()!.estado || '—') }}</span>
              </div>
              <div class="info-item">
                <strong>Pago registrado:</strong>
                <span>{{ metodoPagoLabel(venta()!.metodoPago) }}</span>
              </div>
              @if (venta()!.metodoPago === 'EFECTIVO') {
                <div class="info-item">
                  <strong>Recibido:</strong>
                  <span>{{ venta()!.montoRecibido | currency:'PEN':'S/ ' }}</span>
                </div>
                <div class="info-item">
                  <strong>Vuelto:</strong>
                  <span>{{ venta()!.vuelto | currency:'PEN':'S/ ' }}</span>
                </div>
              }
              @if (venta()!.confirmacionManualPago) {
                <div class="info-item">
                  <strong>Confirmación manual:</strong>
                  <span>
                    {{ venta()!.pagoConfirmadoPor }}
                    @if (venta()!.pagoConfirmadoEn) {
                      · {{ venta()!.pagoConfirmadoEn | date:'dd/MM/yyyy HH:mm' }}
                    }
                  </span>
                </div>
              }
            </div>

            <mat-divider></mat-divider>

            <h3>Productos</h3>
            <table mat-table [dataSource]="venta()!.detalles" class="full-width">
              <ng-container matColumnDef="productoId">
                <th mat-header-cell *matHeaderCellDef>Producto</th>
                <td mat-cell *matCellDef="let row">{{ row.nombreProducto ?? nombresProducto()[row.productoId] ?? ('Producto #' + row.productoId) }}</td>
              </ng-container>

              <ng-container matColumnDef="lote">
                <th mat-header-cell *matHeaderCellDef>Lote / vence (FEFO)</th>
                <td mat-cell *matCellDef="let row">
                  @for (l of lotesDe(row.productoId); track l.loteId) {
                    <span class="lote-linea">
                      <span class="mono">{{ l.codigoLote }}</span>
                      <small>Vto: {{ l.fechaVencimiento | date:'dd/MM/yyyy' }}@if (lotesDe(row.productoId).length > 1) { · {{ l.cantidad }} un. }</small>
                    </span>
                  } @empty {
                    <small class="sin-lote">{{ venta()!.estado === 'CONFIRMADA' ? '—' : 'Pendiente' }}</small>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="cantidad">
                <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                <td mat-cell *matCellDef="let row">{{ row.cantidad }}</td>
              </ng-container>

              <ng-container matColumnDef="precioUnitario">
                <th mat-header-cell *matHeaderCellDef>Precio Unit.</th>
                <td mat-cell *matCellDef="let row">{{ row.precioUnitario | currency:'PEN':'S/ ' }}</td>
              </ng-container>

              <ng-container matColumnDef="subtotal">
                <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                <td mat-cell *matCellDef="let row">{{ row.subtotal | currency:'PEN':'S/ ' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div class="total-section">
              @if (totales().igv > 0) {
                <span class="igv">Op. gravada {{ totales().gravada | currency:'PEN':'S/ ' }} · IGV {{ totales().igv | currency:'PEN':'S/ ' }}</span>
              }
              <h2>TOTAL: {{ venta()!.total | currency:'PEN':'S/ ' }}</h2>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="comprobante-card">
          <mat-card-header>
            <mat-card-title>Comprobante de pago: {{ tipoEtiqueta() }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (venta()!.estado !== 'CONFIRMADA') {
              <p class="form-help">El comprobante se genera cuando la venta queda confirmada.</p>
            } @else if (!esElectronico()) {
              <p>
                <strong>{{ numeroComprobante() ?? 'Sin numeración' }}</strong>
              </p>
              <p class="form-help">
                @if (numeroComprobante()) {
                  Boleta interna de la farmacia; no se envía a SUNAT. Usa «Imprimir comprobante» para entregarla.
                } @else {
                  Venta registrada antes de que existiera la numeración de boletas.
                }
              </p>
            } @else if (cargandoComprobante()) {
              <p role="status">Consultando comprobante…</p>
            } @else if (comprobante()) {
              <div class="comprobante-estado" [attr.data-estado]="comprobante()!.estado">
                <strong>{{ comprobante()!.serie }}-{{ comprobante()!.numero }}</strong>
                <span class="estado-chip">{{ estadoComprobante().etiqueta }}</span>
              </div>
              <p class="form-help">{{ estadoComprobante().ayuda }}</p>
              @if (comprobante()!.descripcionRespuesta) {
                <p class="respuesta-sunat">
                  <strong>Respuesta SUNAT{{ comprobante()!.codigoRespuesta ? ' (' + comprobante()!.codigoRespuesta + ')' : '' }}:</strong>
                  {{ comprobante()!.descripcionRespuesta }}
                </p>
              }
              <p class="fechas">
                Creado {{ comprobante()!.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}
                @if (comprobante()!.fechaRespuesta) {
                  · respuesta {{ comprobante()!.fechaRespuesta | date:'dd/MM/yyyy HH:mm' }}
                }
              </p>
              <div class="comprobante-acciones">
                @if (comprobante()!.estado === 'PREPARADA' && puedeGestionar) {
                  <button mat-raised-button color="primary" (click)="emitir()" [disabled]="procesando()">
                    <mat-icon>send</mat-icon> Enviar a SUNAT
                  </button>
                }
                @if ((comprobante()!.estado === 'ENVIANDO' || comprobante()!.estado === 'RESULTADO_DESCONOCIDO') && puedeGestionar) {
                  <button mat-raised-button color="primary" (click)="consultar()" [disabled]="procesando()">
                    <mat-icon>sync</mat-icon> Consultar estado en SUNAT
                  </button>
                }
                @if (comprobante()!.estado === 'ACEPTADA' || comprobante()!.estado === 'RECHAZADA') {
                  <button mat-stroked-button (click)="descargarCdr()" [disabled]="procesando()">
                    <mat-icon>download</mat-icon> Descargar CDR
                  </button>
                }
              </div>
            } @else {
              <p class="form-help">
                La venta se confirmó, pero su {{ tipoEtiqueta().toLowerCase() }} aún no se generó
                (por ejemplo, SUNAT o la configuración no estaban disponibles).
              </p>
              @if (puedeGestionar) {
                <button mat-raised-button color="primary" (click)="emitir()" [disabled]="procesando()">
                  <mat-icon>receipt</mat-icon> Emitir {{ tipoEtiqueta().toLowerCase() }}
                </button>
              }
            }
            @if (procesando()) {
              <p role="status">Comunicando con SUNAT…</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .lote-linea { display: block; }
    .lote-linea small, .sin-lote { color: var(--kipu-soft); margin-left: 4px; }
    .acciones-cabecera { display: flex; gap: 8px; flex-wrap: wrap; }
    .venta-info { display: flex; gap: 32px; margin-bottom: 16px; flex-wrap: wrap; }
    .info-item { display: flex; gap: 8px; }
    h3 { margin: 16px 0; }
    .total-section {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
      padding: 16px; background: rgba(185, 76, 55, 0.08); border-radius: 4px; margin-top: 16px;
    }
    .total-section h2 { margin: 0; color: #b94c37; }
    .igv { color: #62594e; font-size: 13px; }
    .comprobante-card { margin-top: 16px; }
    .form-help { color: #62594e; line-height: 1.5; }
    .comprobante-estado { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .estado-chip { padding: 2px 10px; border-radius: 999px; font-size: 13px; background: #f1ece5; color: #4a4239; }
    [data-estado='ACEPTADA'] .estado-chip { background: #e3f1e6; color: #1f5f2e; }
    [data-estado='RECHAZADA'] .estado-chip { background: #fbe4e1; color: #8c1d12; }
    [data-estado='RESULTADO_DESCONOCIDO'] .estado-chip,
    [data-estado='ENVIANDO'] .estado-chip { background: #fff1d6; color: #7a4a00; }
    .respuesta-sunat { margin: 8px 0; }
    .fechas { color: #62594e; font-size: 13px; }
    .comprobante-acciones { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    @media (max-width: 600px) {
      .venta-info { flex-direction: column; gap: 8px; }
    }
  `]
})
export class VentaDetalleComponent implements OnInit {
  private ventaService = inject(VentaService);
  private clienteService = inject(ClienteService);
  private productoService = inject(ProductoService);
  private facturacionService = inject(FacturacionService);
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  id = input<string>();
  venta = signal<Venta | null>(null);
  cliente = signal<Cliente | null>(null);
  emisor = signal<EmisorComprobante | null>(null);
  nombresProducto = signal<Partial<Record<number, string>>>({});
  loadError = signal<string | null>(null);
  comprobante = signal<ComprobanteElectronico | null>(null);
  cargandoComprobante = signal(false);
  procesando = signal(false);

  readonly puedeGestionar = this.authService.hasPermission('VENTAS:GESTIONAR');

  displayedColumns = ['productoId', 'lote', 'cantidad', 'precioUnitario', 'subtotal'];
  lotesVenta = signal<LotesDeVenta['lineas']>([]);

  lotesDe(productoId: number) {
    return this.lotesVenta().filter(l => l.productoId === productoId);
  }

  tipoEtiqueta = computed(() => TIPOS_COMPROBANTE[this.venta()?.tipoComprobante ?? 'BOLETA_INTERNA']);
  esElectronico = computed(() => {
    const tipo = this.venta()?.tipoComprobante;
    return tipo === 'FACTURA' || tipo === 'BOLETA_ELECTRONICA';
  });
  numeroComprobante = computed(() => {
    const v = this.venta();
    return v?.serieComprobante && v.numeroComprobante ? `${v.serieComprobante}-${v.numeroComprobante}` : null;
  });
  titulo = computed(() => {
    const numero = this.numeroComprobante()
      ?? (this.comprobante() ? `${this.comprobante()!.serie}-${this.comprobante()!.numero}` : null);
    return numero ? `${this.tipoEtiqueta()} ${numero}` : `Venta #${this.venta()?.id ?? ''}`;
  });
  totales = computed(() => calcularTotales(this.venta()?.detalles ?? []));

  nombreCliente = computed(() => {
    const c = this.cliente();
    if (!c) return this.venta()?.clienteId ? `Cliente #${this.venta()!.clienteId}` : 'Público general';
    return this.venta()?.tipoComprobante === 'FACTURA' && c.razonSocial?.trim()
      ? c.razonSocial.trim() : `${c.nombres} ${c.apellidos}`.trim();
  });

  estadoComprobante = computed(() => {
    const estado = this.comprobante()?.estado;
    return estado ? ESTADOS_COMPROBANTE[estado] ?? { etiqueta: estado, ayuda: '' } : { etiqueta: '', ayuda: '' };
  });

  ngOnInit() {
    if (this.id()) {
      this.ventaService.obtener(+this.id()!).subscribe({
        next: data => {
          this.venta.set(data);
          this.cargarDatosRelacionados(data);
        },
        error: err => {
          console.error('No se pudo cargar el detalle de la venta.', err);
          this.loadError.set('No se pudo cargar el detalle de esta venta.');
        }
      });
    }
  }

  private cargarDatosRelacionados(venta: Venta) {
    if (venta.clienteId) {
      this.clienteService.obtener(venta.clienteId).subscribe({
        next: cliente => this.cliente.set(cliente),
        error: err => console.error('No se pudo cargar el cliente de la venta.', err)
      });
    }
    // Ventas antiguas no guardan el nombre del producto en la línea.
    if (venta.detalles.some(d => !d.nombreProducto)) {
      this.productoService.listar().subscribe({
        next: productos => this.nombresProducto.set(
          Object.fromEntries(productos.filter(p => p.id != null).map(p => [p.id!, p.nombre]))),
        error: err => console.error('No se pudieron cargar los nombres de productos.', err)
      });
    }
    if (venta.estado === 'CONFIRMADA' && venta.claveIdempotencia) {
      this.inventarioService.lotesDeVenta(venta.claveIdempotencia).subscribe({
        next: salida => this.lotesVenta.set(salida.lineas),
        // 404: ventas antiguas sin salida registrada por lote.
        error: err => { if (err?.status !== 404) console.error('No se pudieron cargar los lotes de la venta.', err); }
      });
    }
    this.facturacionService.obtenerOpciones().subscribe({
      next: opciones => this.emisor.set(opciones.emisor),
      error: err => console.error('No se pudieron cargar los datos del emisor.', err)
    });
    const electronico = venta.tipoComprobante === 'FACTURA' || venta.tipoComprobante === 'BOLETA_ELECTRONICA';
    if (venta.estado === 'CONFIRMADA' && electronico && venta.id) {
      this.cargandoComprobante.set(true);
      this.facturacionService.obtenerFactura(venta.id).subscribe({
        next: comprobante => {
          this.comprobante.set(comprobante);
          this.cargandoComprobante.set(false);
        },
        error: (error: HttpErrorResponse) => {
          // 404: el comprobante aún no se generó; la tarjeta ofrece emitirlo.
          if (error.status !== 404) {
            console.error('No se pudo consultar el comprobante.', error);
          }
          this.cargandoComprobante.set(false);
        }
      });
    }
  }

  imprimir() {
    const venta = this.venta();
    if (!venta) return;
    const c = this.cliente();
    const comprobante = this.comprobante();
    // En comprobantes electrónicos la serie y el número vienen del comprobante registrado.
    const ventaImpresa = comprobante && !venta.numeroComprobante
      ? { ...venta, serieComprobante: comprobante.serie, numeroComprobante: comprobante.numero }
      : venta;
    imprimirHtml(htmlComprobante({
      venta: ventaImpresa,
      emisor: this.emisor(),
      nombreFarmacia: this.authService.usuario()?.farmaciaNombre ?? 'Farmacia',
      cliente: c ? {
        nombre: this.nombreCliente(),
        documento: venta.tipoComprobante === 'FACTURA' && c.ruc ? `RUC ${c.ruc}` : c.dni ? `DNI ${c.dni}` : ''
      } : null,
      nombresProducto: this.nombresProducto(),
      estadoSunat: comprobante ? this.estadoComprobante().etiqueta : null
    }));
  }

  emitir() {
    this.ejecutar(this.facturacionService.emitirFactura(this.venta()!.id!));
  }

  consultar() {
    this.ejecutar(this.facturacionService.consultarEnSunat(this.venta()!.id!));
  }

  private ejecutar(operacion: Observable<ComprobanteElectronico>) {
    this.procesando.set(true);
    operacion.subscribe({
      next: comprobante => {
        this.comprobante.set(comprobante);
        this.procesando.set(false);
        this.snackBar.open(ESTADOS_COMPROBANTE[comprobante.estado]?.etiqueta ?? comprobante.estado,
          'OK', { duration: 4000 });
      },
      error: () => {
        // El interceptor ya mostró el motivo; refrescamos por si quedó registrado un intento.
        this.procesando.set(false);
        this.recargarComprobante();
      }
    });
  }

  private recargarComprobante() {
    this.facturacionService.obtenerFactura(this.venta()!.id!).subscribe({
      next: comprobante => this.comprobante.set(comprobante),
      error: () => undefined
    });
  }

  descargarCdr() {
    const comprobante = this.comprobante();
    if (!comprobante) return;
    this.procesando.set(true);
    this.facturacionService.descargarCdr(comprobante.ventaId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `CDR-${comprobante.serie}-${comprobante.numero}.zip`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.procesando.set(false);
      },
      error: () => this.procesando.set(false)
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

  volver() {
    this.router.navigate(['/ventas']);
  }
}
