import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
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
import { AFECTACIONES_IGV, AfectacionIgv, Producto } from '../../../../models/producto.model';
import { AuthService } from '../../../../services/auth.service';

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

              <div class="category-field">
                <mat-form-field appearance="outline">
                  <mat-label>Categoría</mat-label>
                  <mat-select formControlName="categoriaId"
                              [disabled]="cargandoCategorias() || !!errorCategorias() || categorias().length === 0">
                    @for (cat of categorias(); track cat.id) {
                      <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
                    }
                  </mat-select>
                  @if (form.get('categoriaId')?.hasError('required') && form.get('categoriaId')?.touched) {
                    <mat-error>Selecciona una categoría</mat-error>
                  }
                </mat-form-field>
                @if (cargandoCategorias()) {
                  <p class="category-status" role="status">Cargando categorías…</p>
                } @else if (errorCategorias()) {
                  <p class="category-status" role="alert">
                    No se pudieron cargar las categorías.
                    <button mat-button type="button" (click)="cargarCategorias()">Reintentar</button>
                  </p>
                } @else if (categorias().length === 0) {
                  <p class="category-status" role="status">
                    Aún no hay categorías.
                    <a routerLink="/catalogo/categorias/nuevo">Crear categoría</a>
                  </p>
                }
              </div>

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
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="descripcion" rows="3"></textarea>
              </mat-form-field>
            </div>

            <section class="initial-inventory">
              <h2>Ficha del producto</h2>
              <p class="form-help">Opcional. Permite buscarlo por principio activo o con el lector de código de barras.</p>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Principio activo</mat-label>
                  <input matInput formControlName="principioActivo" maxlength="150" placeholder="Paracetamol">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Laboratorio</mat-label>
                  <input matInput formControlName="laboratorio" maxlength="100">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Presentación</mat-label>
                  <input matInput formControlName="presentacion" maxlength="100" placeholder="Caja x 100 tabletas 500 mg">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Registro sanitario (DIGEMID)</mat-label>
                  <input matInput formControlName="registroSanitario" maxlength="30" placeholder="EN-01234">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Código de barras</mat-label>
                  <input matInput formControlName="codigoBarras" maxlength="20" inputmode="numeric">
                  <mat-icon matSuffix>barcode_reader</mat-icon>
                  @if (form.controls.codigoBarras.hasError('pattern')) {
                    <mat-error>Solo números, letras y guiones</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ubicación en almacén</mat-label>
                  <input matInput formControlName="ubicacion" maxlength="50" placeholder="Estante A-3">
                </mat-form-field>
              </div>
            </section>

            @if (puedeConfigurarTributos) {
              <section class="initial-inventory">
                <h2>Datos tributarios (SUNAT)</h2>
                <p class="form-help">
                  Necesarios para incluir este producto en una factura electrónica.
                </p>
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Afectación IGV</mat-label>
                    <mat-select formControlName="afectacionIgv">
                      <mat-option value="">Sin configurar</mat-option>
                      @for (afectacion of afectaciones; track afectacion.codigo) {
                        <mat-option [value]="afectacion.codigo">{{ afectacion.etiqueta }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (form.controls.afectacionIgv.value === '10') {
                    <label class="inventory-toggle">
                      <input type="checkbox" formControlName="precioIncluyeIgv">
                      El precio de venta ya incluye IGV
                    </label>
                  }
                </div>
              </section>
            } @else if (id() && !tieneDatosTributarios) {
              <p class="form-help">
                Este producto aún no tiene datos tributarios. Pide al administrador o al químico
                farmacéutico que los configure para poder facturarlo.
              </p>
            }

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
                      <mat-label>Costo unitario de compra</mat-label>
                      <input matInput type="number" formControlName="costoUnitario" min="0" step="0.01">
                      <span matTextPrefix>S/&nbsp;</span>
                      <mat-hint>Opcional; sirve para valorizar el inventario</mat-hint>
                      @if (form.controls.costoUnitario.hasError('min')) {
                        <mat-error>El costo no puede ser negativo</mat-error>
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
    .category-field { min-width: 0; }
    .category-field mat-form-field { width: 100%; }
    .category-status { margin: -12px 0 12px; color: #62594e; font-size: 13px; }
    .category-status a { color: #993522; }
    .initial-inventory { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4dfd8; }
    .initial-inventory h2 { font-size: 1.1rem; }
    .inventory-toggle { display: flex; align-items: center; gap: 10px; }
    .inventory-toggle input { width: 18px; height: 18px; }
  `
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  id = input<string>();
  loading = signal(false);
  categorias = signal<Categoria[]>([]);
  cargandoCategorias = signal(false);
  errorCategorias = signal(false);
  stockActual = 0;
  tieneDatosTributarios = false;
  readonly afectaciones = AFECTACIONES_IGV;
  /** El backend rechaza datos tributarios enviados por EMPLEADO. */
  readonly puedeConfigurarTributos = this.authService.userRole() !== 'EMPLEADO';
  readonly hoy = this.fechaLocal(new Date());
  private readonly validarFechaVencimiento = (control: AbstractControl) =>
    control.value && control.value < this.hoy ? { fechaPasada: true } : null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    stockMinimo: [0, [Validators.required, Validators.min(0), Validators.max(1_000_000)]],
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    registrarStockInicial: [true],
    codigoLote: ['', [Validators.required, Validators.maxLength(100)]],
    fechaVencimiento: ['', [Validators.required, this.validarFechaVencimiento]],
    cantidadInicial: [1, [
      Validators.required,
      Validators.min(1),
      Validators.max(1_000_000),
      Validators.pattern(/^[1-9]\d*$/)
    ]],
    referenciaDocumento: ['', Validators.maxLength(120)],
    costoUnitario: this.fb.control<number | null>(null, Validators.min(0)),
    principioActivo: ['', Validators.maxLength(150)],
    laboratorio: ['', Validators.maxLength(100)],
    presentacion: ['', Validators.maxLength(100)],
    registroSanitario: ['', Validators.maxLength(30)],
    codigoBarras: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9A-Za-z-]*$/)]],
    ubicacion: ['', Validators.maxLength(50)],
    afectacionIgv: this.fb.nonNullable.control<AfectacionIgv | ''>(''),
    precioIncluyeIgv: [true]
  });

  ngOnInit() {
    this.form.controls.registrarStockInicial.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      this.tieneDatosTributarios = !!producto.afectacionIgv;
      this.form.patchValue({
        afectacionIgv: producto.afectacionIgv ?? '',
        precioIncluyeIgv: producto.precioIncluyeIgv ?? true,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        stockMinimo: producto.stockMinimo ?? 0,
        categoriaId: producto.categoriaId,
        principioActivo: producto.principioActivo ?? '',
        laboratorio: producto.laboratorio ?? '',
        presentacion: producto.presentacion ?? '',
        registroSanitario: producto.registroSanitario ?? '',
        codigoBarras: producto.codigoBarras ?? '',
        ubicacion: producto.ubicacion ?? ''
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.categoriaId === null) {
      this.form.controls.categoriaId.markAsTouched();
      return;
    }
    this.loading.set(true);
    const producto: Producto = {
      nombre: value.nombre,
      descripcion: value.descripcion,
      precio: value.precio,
      stock: 0,
      stockMinimo: value.stockMinimo,
      categoriaId: value.categoriaId,
      principioActivo: value.principioActivo.trim() || null,
      laboratorio: value.laboratorio.trim() || null,
      presentacion: value.presentacion.trim() || null,
      registroSanitario: value.registroSanitario.trim() || null,
      codigoBarras: value.codigoBarras.trim() || null,
      ubicacion: value.ubicacion.trim() || null,
      ...this.datosTributarios(value.afectacionIgv, value.precioIncluyeIgv)
    };

    const operacion = this.id()
      ? this.productoService.actualizar(+this.id()!, { ...producto, stock: this.stockActual })
      : this.productoService.crearConIngreso({
          producto,
          ingresoInicial: value.registrarStockInicial ? {
            referenciaDocumento: value.referenciaDocumento.trim() || null,
            codigoLote: value.codigoLote.trim(),
            fechaVencimiento: value.fechaVencimiento,
            cantidad: value.cantidadInicial,
            costoUnitario: value.costoUnitario ?? null
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
          error?.status === 409
            ? 'Ya existe otro producto con ese código de barras.'
            : 'No se pudo guardar el producto. Verifica los datos e inténtalo nuevamente.',
          'Cerrar',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  /**
   * El backend exige ambos campos juntos o ninguno; con null deja los valores
   * existentes sin cambios. Exonerado e inafecto no llevan IGV en el precio.
   */
  private datosTributarios(afectacion: AfectacionIgv | '', incluyeIgv: boolean) {
    if (!this.puedeConfigurarTributos || !afectacion) {
      return { afectacionIgv: null, precioIncluyeIgv: null };
    }
    return {
      afectacionIgv: afectacion,
      precioIncluyeIgv: afectacion === '10' ? incluyeIgv : false
    };
  }

  irAInventario() {
    this.router.navigate(['/inventario']);
  }

  cancelar() {
    this.router.navigate(['/catalogo/productos']);
  }
}
