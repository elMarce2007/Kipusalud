import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe } from '@angular/common';

import { ClienteService } from '../../../services/cliente.service';
import { ProductoService } from '../../../services/producto.service';
import { VentaService } from '../../../services/venta.service';
import { Cliente } from '../../../models/cliente.model';
import { Producto } from '../../../models/producto.model';
import { DetalleVenta, MetodoPago } from '../../../models/venta.model';

@Component({
  selector: 'app-venta-nueva',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule
  ],
  template: `
    <div class="venta-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Punto de venta</p>
          <h1>Nueva venta</h1>
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
        </div>
      }

      <div class="venta-grid">
        <mat-card class="cliente-card">
          <mat-card-header>
            <mat-card-title>Cliente</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Seleccionar Cliente</mat-label>
              <mat-select [value]="clienteSeleccionado" (selectionChange)="seleccionarCliente($event.value)">
                @for (cliente of clientes(); track cliente.id) {
                  <mat-option [value]="cliente">
                    {{ cliente.nombres }} {{ cliente.apellidos }} - {{ cliente.dni }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card class="producto-card">
          <mat-card-header>
            <mat-card-title>Agregar Producto</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="productoForm" (ngSubmit)="agregarProducto()">
              <mat-form-field appearance="outline">
                <mat-label>Producto</mat-label>
                <mat-select formControlName="producto">
                  @for (producto of productos(); track producto.id) {
                    <mat-option [value]="producto" [disabled]="producto.stock === 0">
                      {{ producto.nombre }} - S/{{ producto.precio }} (Stock: {{ producto.stock }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Cantidad</mat-label>
                <input matInput type="number" formControlName="cantidad" min="1">
              </mat-form-field>

              <button mat-raised-button color="accent" type="submit"
                      [disabled]="productoForm.invalid">
                <mat-icon>add_shopping_cart</mat-icon> Agregar
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="detalles-card">
        <mat-card-header>
          <mat-card-title>Detalle de Venta</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="detalles()" class="full-width">
            <ng-container matColumnDef="producto">
              <th mat-header-cell *matHeaderCellDef>Producto</th>
              <td mat-cell *matCellDef="let row">{{ row.productoNombre }}</td>
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

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row; let i = index">
                <button mat-icon-button color="warn" (click)="eliminarDetalle(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" colspan="5" style="text-align: center; padding: 20px;">
                Agregue productos a la venta
              </td>
            </tr>
          </table>

          <div class="total-section">
            <h2>TOTAL: {{ total() | currency:'PEN':'S/ ' }}</h2>
          </div>

          <section class="payment-panel" aria-labelledby="payment-heading">
            <div>
              <h3 id="payment-heading">Registrar forma de pago</h3>
              <p>El pago se registra manualmente; KipuSalud no procesa transacciones externas.</p>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Método de pago</mat-label>
              <mat-select [value]="metodoPago()" (selectionChange)="cambiarMetodoPago($event.value)">
                <mat-option value="EFECTIVO">Efectivo</mat-option>
                <mat-option value="YAPE">Yape</mat-option>
                <mat-option value="PLIN">Plin</mat-option>
                <mat-option value="TARJETA">Tarjeta</mat-option>
                <mat-option value="TRANSFERENCIA">Transferencia</mat-option>
              </mat-select>
            </mat-form-field>

            @if (metodoPago() === 'EFECTIVO') {
              <mat-form-field appearance="outline">
                <mat-label>Monto recibido</mat-label>
                <span matTextPrefix>S/&nbsp;</span>
                <input matInput type="number" min="0" step="0.01"
                       [value]="montoRecibido()"
                       (input)="actualizarMonto($event)">
              </mat-form-field>
              <div class="change-due">
                <span>Vuelto</span>
                <strong>{{ vuelto() | currency:'PEN':'S/ ' }}</strong>
              </div>
            } @else {
              <mat-checkbox [checked]="pagoExternoVerificado()"
                            (change)="cambiarConfirmacionPagoExterno($event.checked)">
                Confirmo que verifiqué el pago fuera de KipuSalud
              </mat-checkbox>
            }
          </section>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancelar()">Cancelar</button>
          <button mat-raised-button color="primary"
                  (click)="confirmarVenta()"
                  [disabled]="!puedeConfirmar()">
            <mat-icon>check</mat-icon> Registrar venta
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: ``
})
export class VentaNuevaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);
  private productoService = inject(ProductoService);
  private ventaService = inject(VentaService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  detalles = signal<DetalleVenta[]>([]);
  loadError = signal<string | null>(null);
  clienteSeleccionado: Cliente | null = null;
  private pendingVentaKey: string | null = null;
  loading = signal(false);
  metodoPago = signal<MetodoPago>('EFECTIVO');
  montoRecibido = signal(0);
  pagoExternoVerificado = signal(false);

  displayedColumns = ['producto', 'cantidad', 'precioUnitario', 'subtotal', 'acciones'];

  total = computed(() =>
    this.detalles().reduce((sum, d) => sum + d.subtotal, 0)
  );
  vuelto = computed(() => Math.max(0, this.montoRecibido() - this.total()));
  puedeConfirmar = computed(() => !!this.clienteSeleccionado
    && this.detalles().length > 0
    && !this.loading()
    && (this.metodoPago() === 'EFECTIVO'
      ? this.montoRecibido() >= this.total()
      : this.pagoExternoVerificado()));

  productoForm = this.fb.group({
    producto: [null as Producto | null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() {
    this.loadError.set(null);
    this.clienteService.listar().subscribe({
      next: data => {
        this.clientes.set(data);
        const clienteId = Number(this.route.snapshot.queryParamMap.get('clienteId'));
        if (Number.isSafeInteger(clienteId) && clienteId > 0) {
          this.clienteSeleccionado = data.find(cliente => cliente.id === clienteId) ?? null;
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
  }

  agregarProducto() {
    const { producto, cantidad } = this.productoForm.value;
    if (!producto || !cantidad) return;

    const cantidadEnCarrito = this.detalles()
      .filter(detalle => detalle.productoId === producto.id)
      .reduce((total, detalle) => total + detalle.cantidad, 0);
    if (cantidad + cantidadEnCarrito > producto.stock) {
      this.snackBar.open('Stock insuficiente', 'OK', { duration: 3000 });
      return;
    }

    const detalle: DetalleVenta = {
      productoId: producto.id!,
      productoNombre: producto.nombre,
      cantidad: cantidad,
      precioUnitario: producto.precio,
      subtotal: producto.precio * cantidad
    };

    this.detalles.update(arr => [...arr, detalle]);
    this.pendingVentaKey = null;
    this.productoForm.reset({ cantidad: 1 });
  }

  seleccionarCliente(cliente: Cliente | null): void {
    this.clienteSeleccionado = cliente;
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

  eliminarDetalle(index: number) {
    this.detalles.update(arr => arr.filter((_, i) => i !== index));
    this.pendingVentaKey = null;
  }

  confirmarVenta() {
    if (!this.puedeConfirmar() || !this.clienteSeleccionado?.id) return;

    this.loading.set(true);
    this.pendingVentaKey ??= crypto.randomUUID();
    const metodoPago = this.metodoPago();
    const venta = {
      claveIdempotencia: this.pendingVentaKey,
      clienteId: this.clienteSeleccionado.id!,
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
      next: () => {
        this.pendingVentaKey = null;
        this.snackBar.open('Venta registrada. Verifica el stock actualizado.', 'OK', { duration: 4000 });
        this.router.navigate(['/ventas']);
      },
      error: (err: { status?: number }) => {
        console.error('No se pudo registrar la venta.', err);
        this.loading.set(false);
        this.snackBar.open(err.status === 409
          ? 'Stock insuficiente. Actualiza la lista de productos e inténtalo de nuevo.'
          : 'No se pudo registrar la venta. Revisa los datos e inténtalo de nuevo.',
        'Cerrar', { duration: 5000 });
      }
    });
  }

  cancelar() {
    this.router.navigate(['/ventas']);
  }
}
