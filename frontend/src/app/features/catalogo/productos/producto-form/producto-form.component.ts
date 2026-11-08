import { Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProductoService } from '../../../../services/producto.service';
import { CategoriaService } from '../../../../services/categoria.service';
import { Categoria } from '../../../../models/categoria.model';
import { Producto } from '../../../../models/producto.model';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
  ],
  template: `
    <div class="form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ id() ? 'Editar' : 'Nuevo' }} producto</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (!id()) {
            <p class="form-help">
              Registra el producto y, si ya tienes existencias, añade su primer lote con fecha de vencimiento.
              El stock siempre se controla por lote.
            </p>
          }
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="nombre">
                @if (form.get('nombre')?.hasError('required') && form.get('nombre')?.touched) {
                  <mat-error>Nombre es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Categoria</mat-label>
                <mat-select formControlName="categoriaId" placeholder="Selecciona una categoría"
                            [disabled]="cargandoCategorias() || !!errorCategorias() || categorias().length === 0">
                  @for (cat of categorias(); track cat.id) {
                    <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
                  }
                </mat-select>
                @if (errorCategorias()) {
                  <mat-hint>
                    No se pudieron cargar las categorías.
                    <button mat-button type="button" (click)="cargarCategorias()">Reintentar</button>
                  </mat-hint>
                } @else if (!cargandoCategorias() && categorias().length === 0) {
                  <mat-hint>
                    Aún no hay categorías.
                    <a routerLink="/catalogo/categorias/nuevo">Crear categoría</a>
                  </mat-hint>
                }
                @if (form.get('categoriaId')?.hasError('required') && form.get('categoriaId')?.touched) {
                  <mat-error>Categoria es requerida</mat-error>
                }
                @if (form.get('categoriaId')?.hasError('min') && form.get('categoriaId')?.touched) {
                  <mat-error>Selecciona una categoría válida</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Precio</mat-label>
                <input matInput type="number" formControlName="precio" step="0.01">
                <span matTextPrefix>S/&nbsp;</span>
                @if (form.get('precio')?.hasError('required') && form.get('precio')?.touched) {
                  <mat-error>Precio es requerido</mat-error>
                }
                @if (form.get('precio')?.hasError('min') && form.get('precio')?.touched) {
                  <mat-error>Precio debe ser mayor a 0</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Stock mínimo para alertas</mat-label>
                <input matInput type="number" formControlName="stockMinimo" min="0" max="1000000" step="1">
                <mat-hint>Usa 0 para desactivar las alertas por stock bajo</mat-hint>
                @if (form.get('stockMinimo')?.hasError('min') && form.get('stockMinimo')?.touched) {
                  <mat-error>El stock mínimo no puede ser negativo</mat-error>
                }
                @if (form.get('stockMinimo')?.hasError('max') && form.get('stockMinimo')?.touched) {
                  <mat-error>El stock mínimo no puede superar 1,000,000</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripcion</mat-label>
                <textarea matInput formControlName="descripcion" rows="3"></textarea>
              </mat-form-field>
            </div>

            @if (!id()) {
              <section class="initial-inventory">
                <h2>Existencias iniciales</h2>
                <label class="inventory-toggle">
                  <input type="checkbox" formControlName="registrarStockInicial">
                  Registrar el primer lote ahora
                </label>

                @if (form.controls.registrarStockInicial.value) {
                  <p class="form-help">
                    Ingresa los datos tal como aparecen en el envase. No se aceptan lotes sin vencimiento.
                  </p>
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Número de lote</mat-label>
                      <input matInput formControlName="codigoLote" maxlength="100">
                      @if (form.controls.codigoLote.hasError('required') && form.controls.codigoLote.touched) {
                        <mat-error>El número de lote es requerido</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Fecha de vencimiento</mat-label>
                      <input matInput type="date" formControlName="fechaVencimiento" [min]="hoy">
                      @if (form.controls.fechaVencimiento.hasError('required') && form.controls.fechaVencimiento.touched) {
                        <mat-error>La fecha de vencimiento es requerida</mat-error>
                      }
                      @if (form.controls.fechaVencimiento.hasError('fechaPasada') && form.controls.fechaVencimiento.touched) {
                        <mat-error>La fecha de vencimiento no puede estar en el pasado</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Cantidad recibida</mat-label>
                      <input matInput type="number" formControlName="cantidadInicial" min="1" max="1000000" step="1">
                      @if (form.controls.cantidadInicial.hasError('min') && form.controls.cantidadInicial.touched) {
                        <mat-error>La cantidad debe ser al menos 1</mat-error>
                      }
                      @if (form.controls.cantidadInicial.hasError('max') && form.controls.cantidadInicial.touched) {
                        <mat-error>La cantidad no puede superar 1,000,000</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Referencia de guía o factura</mat-label>
                      <input matInput formControlName="referenciaDocumento" maxlength="120">
                    </mat-form-field>
                  </div>
                }
              </section>
            } @else {
              <section class="initial-inventory">
                <h2>Stock</h2>
                <p class="form-help">El stock actual es {{ stockActual }}. Registra nuevos lotes desde Inventario para conservar su trazabilidad y vencimiento.</p>
                <button mat-stroked-button type="button" (click)="irAInventario()">
                  <mat-icon>receipt_long</mat-icon> Registrar ingreso por lote
                </button>
              </section>
            }

            <div class="form-actions">
              <button mat-button type="button" (click)="cancelar()">Cancelar</button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || loading()">
                {{ id() ? 'Actualizar producto' : 'Guardar producto' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .form-help { color: #62594e; line-height: 1.5; }
    .initial-inventory { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4dfd8; }
    .initial-inventory h2 { font-size: 1.1rem; }
    .inventory-toggle { display: flex; align-items: center; gap: 10px; }
    .inventory-toggle input { width: 18px; height: 18px; }
  `
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  id = input<string>();
  loading = signal(false);
  categorias = signal<Categoria[]>([]);
  cargandoCategorias = signal(false);
  errorCategorias = signal(false);
  stockActual = 0;
  readonly hoy = this.fechaLocal(new Date());
  private readonly validarFechaVencimiento = (control: AbstractControl) =>
    control.value && control.value < this.hoy ? { fechaPasada: true } : null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    stockMinimo: [0, [Validators.required, Validators.min(0), Validators.max(1_000_000)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    registrarStockInicial: [true],
    codigoLote: ['', [Validators.required, Validators.maxLength(100)]],
    fechaVencimiento: ['', [Validators.required, this.validarFechaVencimiento]],
    cantidadInicial: [1, [
      Validators.required,
      Validators.min(1),
      Validators.max(1_000_000),
      Validators.pattern(/^[1-9]\d*$/)
    ]],
    referenciaDocumento: ['', Validators.maxLength(120)]
  });

  ngOnInit() {
    this.form.controls.registrarStockInicial.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(registrar => this.actualizarValidacionesIngreso(registrar));
    this.cargarCategorias();
    if (this.id()) {
      this.form.controls.registrarStockInicial.setValue(false, { emitEvent: false });
      this.actualizarValidacionesIngreso(false);
      this.cargarProducto();
    }
  }

  private actualizarValidacionesIngreso(registrar: boolean) {
    this.form.controls.codigoLote.setValidators(registrar
      ? [Validators.required, Validators.maxLength(100)]
      : []);
    this.form.controls.fechaVencimiento.setValidators(registrar
      ? [Validators.required, this.validarFechaVencimiento]
      : []);
    this.form.controls.cantidadInicial.setValidators(registrar
      ? [
          Validators.required,
          Validators.min(1),
          Validators.max(1_000_000),
          Validators.pattern(/^[1-9]\d*$/)
        ]
      : []);
    this.form.controls.codigoLote.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fechaVencimiento.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cantidadInicial.updateValueAndValidity({ emitEvent: false });
  }

  private fechaLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  cargarCategorias() {
    this.cargandoCategorias.set(true);
    this.errorCategorias.set(false);
    this.categoriaService.listar().subscribe({
      next: data => {
        this.categorias.set(data);
        this.cargandoCategorias.set(false);
      },
      error: error => {
        console.error('No se pudieron cargar las categorías para el formulario de producto.', error);
        this.categorias.set([]);
        this.errorCategorias.set(true);
        this.cargandoCategorias.set(false);
      }
    });
  }

  cargarProducto() {
    this.productoService.obtener(+this.id()!).subscribe(producto => {
      this.stockActual = producto.stock;
      this.form.patchValue({
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        stockMinimo: producto.stockMinimo ?? 0,
        categoriaId: producto.categoriaId
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const value = this.form.getRawValue();
    const producto: Producto = {
      nombre: value.nombre,
      descripcion: value.descripcion,
      precio: value.precio,
      stock: 0,
      stockMinimo: value.stockMinimo,
      categoriaId: value.categoriaId
    };

    const operacion = this.id()
      ? this.productoService.actualizar(+this.id()!, { ...producto, stock: this.stockActual })
      : this.productoService.crearConIngreso({
          producto,
          ingresoInicial: value.registrarStockInicial ? {
            referenciaDocumento: value.referenciaDocumento.trim() || null,
            codigoLote: value.codigoLote.trim(),
            fechaVencimiento: value.fechaVencimiento,
            cantidad: value.cantidadInicial
          } : null
        });

    operacion.subscribe({
      next: () => {
        this.snackBar.open(
          this.id()
            ? 'Producto actualizado. El stock se conserva sin cambios.'
            : value.registrarStockInicial
              ? 'Producto creado y lote inicial registrado.'
              : 'Producto creado sin existencias iniciales.',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/catalogo/productos']);
      },
      error: error => {
        console.error('No se pudo guardar el producto y su inventario inicial.', error);
        this.snackBar.open(
          'No se pudo guardar el producto. Verifica los datos e inténtalo nuevamente.',
          'Cerrar',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  irAInventario() {
    this.router.navigate(['/inventario']);
  }

  cancelar() {
    this.router.navigate(['/catalogo/productos']);
  }
}
