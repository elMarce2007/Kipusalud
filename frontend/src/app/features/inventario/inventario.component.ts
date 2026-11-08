import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize } from 'rxjs';
import { AlertaInventario, IngresoInventarioRequest, LineaIngresoInventario, LoteInventario, MovimientoInventario } from '../../models/inventario.model';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';
import { ProductoService } from '../../services/producto.service';
import { createIdempotencyKey } from '../../core/utils/idempotency-key';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule
  ],
  template: `
    <main class="page-container">
      <header class="page-header">
        <div>
          <p class="eyebrow">Trazabilidad por lote</p>
          <h1>Inventario y Kardex</h1>
          <p class="intro">Registra ingresos con lote y vencimiento, y consulta movimientos y alertas.</p>
        </div>
      </header>

      @if (pageError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ pageError() }}</span>
        </div>
      }

      <mat-tab-group>
        <mat-tab label="Registrar ingreso">
          <section class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Ingreso de mercadería</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p class="help">El ingreso actualiza el stock y registra el movimiento en una operación atómica.</p>
                <form [formGroup]="lineForm" (ngSubmit)="agregarLinea()">
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Referencia de guía o factura</mat-label>
                      <input matInput formControlName="referencia" maxlength="120">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Producto</mat-label>
                      <mat-select formControlName="productoId">
                        @for (producto of productos(); track producto.id) {
                          <mat-option [value]="producto.id">{{ producto.nombre }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Número de lote</mat-label>
                      <input matInput formControlName="codigoLote" maxlength="100">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Fecha de vencimiento</mat-label>
                      <input matInput type="date" formControlName="fechaVencimiento">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Cantidad recibida</mat-label>
                      <input matInput type="number" formControlName="cantidad" min="1" max="1000000">
                    </mat-form-field>
                    <button mat-raised-button color="primary" type="submit" [disabled]="lineForm.invalid">
                      <mat-icon>add</mat-icon> Añadir línea
                    </button>
                  </div>
                </form>

                @if (lineas().length) {
                  <div class="table-wrap">
                    <table mat-table [dataSource]="lineas()">
                      <ng-container matColumnDef="producto">
                        <th mat-header-cell *matHeaderCellDef>Producto</th>
                        <td mat-cell *matCellDef="let row">{{ nombreProducto(row.productoId) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="lote">
                        <th mat-header-cell *matHeaderCellDef>Lote</th>
                        <td mat-cell *matCellDef="let row">{{ row.codigoLote }}</td>
                      </ng-container>
                      <ng-container matColumnDef="vencimiento">
                        <th mat-header-cell *matHeaderCellDef>Vencimiento</th>
                        <td mat-cell *matCellDef="let row">{{ row.fechaVencimiento | date:'dd/MM/yyyy' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="cantidad">
                        <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                        <td mat-cell *matCellDef="let row">{{ row.cantidad }}</td>
                      </ng-container>
                      <ng-container matColumnDef="acciones">
                        <th mat-header-cell *matHeaderCellDef>Acciones</th>
                        <td mat-cell *matCellDef="let row; let i = index">
                          <button mat-icon-button type="button" aria-label="Quitar línea"
                                  [disabled]="loading()" (click)="quitarLinea(i)">
                            <mat-icon>delete_outline</mat-icon>
                          </button>
                        </td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
                    </table>
                  </div>
                } @else {
                  <p class="empty-state">Agrega al menos una línea para registrar el ingreso.</p>
                }
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-raised-button color="primary" type="button"
                        [disabled]="!lineas().length || loading()"
                        (click)="registrarIngreso()">
                  <mat-icon>{{ loading() ? 'hourglass_top' : 'inventory' }}</mat-icon>
                  {{ retryPending() ? 'Reintentar ingreso pendiente' : 'Confirmar ingreso' }}
                </button>
              </mat-card-actions>
            </mat-card>
          </section>
        </mat-tab>

        <mat-tab label="Alertas">
          <section class="tab-content">
            <div class="section-heading">
              <div>
                <h2>Próximos a vencer</h2>
                <p>Alertas de lotes verificados con existencias disponibles en los próximos 30 días.</p>
              </div>
              <button mat-stroked-button type="button" (click)="cargarAlertas()">
                <mat-icon>refresh</mat-icon> Actualizar
              </button>
            </div>
            @if (!alertas().length) {
              <mat-card><mat-card-content class="empty-state">No hay lotes verificados próximos a vencer en este periodo.</mat-card-content></mat-card>
            } @else {
              <div class="alert-grid">
                @for (alerta of alertas(); track alerta.loteId) {
                  <mat-card class="alert-card" [class.high]="alerta.prioridad === 'ALTA'">
                    <mat-card-content>
                      <span class="priority">{{ alerta.prioridad === 'ALTA' ? 'Atención prioritaria' : 'Próximo a vencer' }}</span>
                      <h3>{{ alerta.producto }}</h3>
                      <p>Lote {{ alerta.codigoLote }} · vence {{ alerta.fechaVencimiento | date:'dd/MM/yyyy' }}</p>
                      <strong>{{ alerta.cantidad }} unidades disponibles</strong>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          </section>
        </mat-tab>

        <mat-tab label="Lotes y Kardex">
          <section class="tab-content">
            <mat-card>
              <mat-card-content>
                <mat-form-field appearance="outline" class="product-select">
                  <mat-label>Producto</mat-label>
                  <mat-select (selectionChange)="seleccionarProducto($event.value)">
                    @for (producto of productos(); track producto.id) {
                      <mat-option [value]="producto.id">{{ producto.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (productoConsulta()) {
                  <h2>Lotes</h2>
                  @if (lotes().length) {
                    <div class="table-wrap">
                      <table mat-table [dataSource]="lotes()">
                        <ng-container matColumnDef="lote">
                          <th mat-header-cell *matHeaderCellDef>Lote</th>
                          <td mat-cell *matCellDef="let row">{{ row.codigoLote }}</td>
                        </ng-container>
                        <ng-container matColumnDef="vencimiento">
                          <th mat-header-cell *matHeaderCellDef>Vencimiento</th>
                          <td mat-cell *matCellDef="let row">
                            @if (row.fechaVencimiento) { {{ row.fechaVencimiento | date:'dd/MM/yyyy' }} }
                            @else { Sin verificar }
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="disponible">
                          <th mat-header-cell *matHeaderCellDef>Disponible</th>
                          <td mat-cell *matCellDef="let row">{{ row.cantidadDisponible }}</td>
                        </ng-container>
                        <ng-container matColumnDef="estado">
                          <th mat-header-cell *matHeaderCellDef>Estado</th>
                          <td mat-cell *matCellDef="let row">{{ row.verificado ? 'Verificado' : 'Requiere revisión' }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="lotColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: lotColumns"></tr>
                      </table>
                    </div>
                  } @else {
                    <p class="empty-state">Este producto aún no tiene lotes registrados.</p>
                  }
                  <h2>Kardex</h2>
                  @if (movimientos().length) {
                    <div class="table-wrap">
                      <table mat-table [dataSource]="movimientos()">
                        <ng-container matColumnDef="fecha">
                          <th mat-header-cell *matHeaderCellDef>Fecha</th>
                          <td mat-cell *matCellDef="let row">{{ row.creadoEn | date:'dd/MM/yyyy HH:mm' }}</td>
                        </ng-container>
                        <ng-container matColumnDef="tipo">
                          <th mat-header-cell *matHeaderCellDef>Movimiento</th>
                          <td mat-cell *matCellDef="let row">{{ row.tipo }}</td>
                        </ng-container>
                        <ng-container matColumnDef="cantidad">
                          <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                          <td mat-cell *matCellDef="let row">{{ row.cantidad > 0 ? '+' : '' }}{{ row.cantidad }}</td>
                        </ng-container>
                        <ng-container matColumnDef="actor">
                          <th mat-header-cell *matHeaderCellDef>Registrado por</th>
                          <td mat-cell *matCellDef="let row">{{ row.actor }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="movementColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: movementColumns"></tr>
                      </table>
                    </div>
                  } @else {
                    <p class="empty-state">No hay movimientos para este producto.</p>
                  }
                }
              </mat-card-content>
            </mat-card>
          </section>
        </mat-tab>
      </mat-tab-group>
    </main>
  `,
  styles: [`
    .intro, .help, .section-heading p { color: #57423e; }
    .tab-content { padding: 24px 0; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; align-items: center; }
    .form-grid mat-form-field, .product-select { width: 100%; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; }
    .empty-state { padding: 24px 12px; color: #57423e; text-align: center; }
    .section-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 8px 0 18px; }
    .section-heading h2 { margin: 0; }
    .alert-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .alert-card { border-left: 4px solid #966500; }
    .alert-card.high { border-left-color: #993522; }
    .priority { color: #764e00; font-size: .8rem; font-weight: 700; text-transform: uppercase; }
    .alert-card h3 { margin: 10px 0 4px; }
    @media (max-width: 600px) {
      .section-heading { align-items: flex-start; flex-direction: column; }
      .tab-content { padding: 16px 0; }
    }
  `]
})
export class InventarioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventarioService = inject(InventarioService);
  private readonly productoService = inject(ProductoService);
  private readonly snackBar = inject(MatSnackBar);

  productos = signal<Producto[]>([]);
  lineas = signal<LineaIngresoInventario[]>([]);
  alertas = signal<AlertaInventario[]>([]);
  lotes = signal<LoteInventario[]>([]);
  movimientos = signal<MovimientoInventario[]>([]);
  productoConsulta = signal<number | null>(null);
  pageError = signal<string | null>(null);
  loading = signal(false);
  retryPending = signal(false);
  private pendingRequest: IngresoInventarioRequest | null = null;

  readonly lineColumns = ['producto', 'lote', 'vencimiento', 'cantidad', 'acciones'];
  readonly lotColumns = ['lote', 'vencimiento', 'disponible', 'estado'];
  readonly movementColumns = ['fecha', 'tipo', 'cantidad', 'actor'];

  readonly lineForm = this.fb.nonNullable.group({
    referencia: [''],
    productoId: [0, Validators.min(1)],
    codigoLote: ['', [Validators.required, Validators.maxLength(100)]],
    fechaVencimiento: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(1_000_000)]]
  });

  ngOnInit(): void {
    this.productoService.listar().subscribe({
      next: products => this.productos.set(products),
      error: error => {
        console.error('No se pudieron cargar los productos del inventario.', error);
        this.pageError.set('No se pudieron cargar los productos. Intenta actualizar la página.');
      }
    });
    this.cargarAlertas();
  }

  agregarLinea(): void {
    if (this.lineForm.invalid || this.loading()) {
      return;
    }
    const value = this.lineForm.getRawValue();
    const productoId = Number(value.productoId);
    const cantidad = Number(value.cantidad);
    const fechaVencimiento = value.fechaVencimiento;
    if (!Number.isSafeInteger(productoId) || productoId <= 0
        || !Number.isSafeInteger(cantidad) || cantidad <= 0 || !fechaVencimiento) {
      return;
    }
    if (this.lineas().some(line => line.productoId === productoId
        && line.codigoLote.toLocaleUpperCase() === value.codigoLote.trim().toLocaleUpperCase())) {
      this.snackBar.open('El lote ya está en la lista de ingresos.', 'Cerrar', { duration: 3500 });
      return;
    }
    this.pendingRequest = null;
    this.retryPending.set(false);
    this.lineas.update(lines => [...lines, {
      productoId,
      codigoLote: value.codigoLote.trim().toLocaleUpperCase(),
      fechaVencimiento,
      cantidad
    }]);
    this.lineForm.patchValue({
      productoId: 0,
      codigoLote: '',
      fechaVencimiento: '',
      cantidad: 1
    });
  }

  quitarLinea(index: number): void {
    if (this.loading()) {
      return;
    }
    this.lineas.update(lines => lines.filter((_, lineIndex) => lineIndex !== index));
    this.pendingRequest = null;
    this.retryPending.set(false);
  }

  registrarIngreso(): void {
    if (this.loading() || !this.lineas().length) {
      return;
    }
    this.pendingRequest ??= {
      claveIdempotencia: createIdempotencyKey(),
      referenciaDocumento: this.lineForm.controls.referencia.value.trim() || null,
      lineas: this.lineas().map(line => ({ ...line }))
    };
    this.loading.set(true);
    this.inventarioService.registrarIngreso(this.pendingRequest)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.lineas.set([]);
          this.pendingRequest = null;
          this.retryPending.set(false);
          this.lineForm.controls.referencia.setValue('');
          this.snackBar.open(
            result.repetido ? 'El ingreso ya estaba registrado; no se duplicó.' : 'Ingreso registrado y Kardex actualizado.',
            'Cerrar',
            { duration: 4500 }
          );
          this.cargarAlertas();
          if (this.productoConsulta()) {
            this.seleccionarProducto(this.productoConsulta()!);
          }
        },
        error: error => {
          console.error('No se pudo confirmar el ingreso de mercadería.', error);
          this.retryPending.set(true);
          this.pageError.set('No se confirmó el ingreso. Puedes reintentar la misma operación sin duplicarla.');
        }
      });
  }

  cargarAlertas(): void {
    this.inventarioService.listarAlertas().subscribe({
      next: alerts => {
        this.alertas.set(alerts);
        this.pageError.set(null);
      },
      error: error => {
        console.error('No se pudieron cargar las alertas de inventario.', error);
        this.pageError.set('No se pudieron cargar las alertas de inventario.');
      }
    });
  }

  seleccionarProducto(productoId: number): void {
    this.productoConsulta.set(productoId);
    this.inventarioService.listarLotes(productoId).subscribe({
      next: lots => this.lotes.set(lots),
      error: error => {
        console.error('No se pudieron cargar los lotes del producto.', error);
        this.pageError.set('No se pudieron cargar los lotes del producto seleccionado.');
      }
    });
    this.inventarioService.listarKardex(productoId).subscribe({
      next: movements => this.movimientos.set(movements),
      error: error => {
        console.error('No se pudo cargar el Kardex del producto.', error);
        this.pageError.set('No se pudo cargar el Kardex del producto seleccionado.');
      }
    });
  }

  nombreProducto(productoId: number): string {
    return this.productos().find(producto => producto.id === productoId)?.nombre
      ?? `Producto #${productoId}`;
  }
}
