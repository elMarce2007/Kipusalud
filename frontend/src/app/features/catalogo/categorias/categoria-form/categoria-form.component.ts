import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CategoriaService } from '../../../../services/categoria.service';
import { CONDICIONES_VENTA, CondicionVenta } from '../../../../models/categoria.model';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ id() ? 'Editar' : 'Nueva' }} categoría</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="nombre">
                @if (form.get('nombre')?.hasError('required') && form.get('nombre')?.touched) {
                  <mat-error>Nombre es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Condición de venta</mat-label>
                <mat-select formControlName="condicionVenta">
                  @for (c of condiciones; track c.valor) {
                    <mat-option [value]="c.valor">{{ c.etiqueta }}</mat-option>
                  }
                </mat-select>
                <mat-hint>Se muestra en el punto de venta al dispensar</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Código ATC</mat-label>
                <input matInput formControlName="codigoAtc" maxlength="10" placeholder="N02BE"
                       style="text-transform: uppercase">
                <mat-hint>Clasificación anatómica, terapéutica y química (opcional)</mat-hint>
                @if (form.controls.codigoAtc.hasError('pattern')) {
                  <mat-error>Solo letras, números y guiones</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="descripcion" rows="3"></textarea>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-button type="button" (click)="cancelar()">Cancelar</button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || loading()">
                {{ id() ? 'Actualizar' : 'Guardar' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: ``
})
export class CategoriaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoriaService = inject(CategoriaService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  id = input<string>();
  loading = signal(false);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    codigoAtc: ['', [Validators.maxLength(10), Validators.pattern(/^[A-Za-z0-9-]*$/)]],
    condicionVenta: this.fb.nonNullable.control<CondicionVenta>('VENTA_LIBRE')
  });
  readonly condiciones = CONDICIONES_VENTA;

  ngOnInit() {
    if (this.id()) {
      this.cargarCategoria();
    }
  }

  cargarCategoria() {
    this.categoriaService.obtener(+this.id()!).subscribe(categoria => {
      this.form.patchValue({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion ?? '',
        codigoAtc: categoria.codigoAtc ?? '',
        condicionVenta: categoria.condicionVenta ?? 'VENTA_LIBRE'
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const valor = this.form.getRawValue();
    const categoria = { ...valor, codigoAtc: valor.codigoAtc.trim().toUpperCase() || null };

    const operacion = this.id()
      ? this.categoriaService.actualizar(+this.id()!, categoria)
      : this.categoriaService.crear(categoria);

    operacion.subscribe({
      next: () => {
        this.snackBar.open(
          `Categoría ${this.id() ? 'actualizada' : 'creada'} exitosamente`,
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/catalogo/categorias']);
      },
      error: () => this.loading.set(false)
    });
  }

  cancelar() {
    this.router.navigate(['/catalogo/categorias']);
  }
}
