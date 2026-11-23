import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ClienteService } from '../../../services/cliente.service';

/** RUC, razón social y dirección fiscal van juntos: o los tres, o ninguno. */
export const datosFiscalesCompletos = (group: AbstractControl): ValidationErrors | null => {
  const valores = ['ruc', 'razonSocial', 'direccionFiscal']
    .map(campo => String(group.get(campo)?.value ?? '').trim());
  const llenos = valores.filter(v => v.length > 0).length;
  return llenos === 0 || llenos === valores.length ? null : { datosFiscalesIncompletos: true };
};

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ id() ? 'Editar' : 'Nuevo' }} Cliente</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nombres</mat-label>
                <input matInput formControlName="nombres">
                @if (form.get('nombres')?.hasError('required') && form.get('nombres')?.touched) {
                  <mat-error>Nombres es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Apellidos</mat-label>
                <input matInput formControlName="apellidos">
                @if (form.get('apellidos')?.hasError('required') && form.get('apellidos')?.touched) {
                  <mat-error>Apellidos es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>DNI</mat-label>
                <input matInput formControlName="dni" maxlength="8">
                @if (form.get('dni')?.hasError('required') && form.get('dni')?.touched) {
                  <mat-error>DNI es requerido</mat-error>
                }
                @if (form.get('dni')?.hasError('pattern') && form.get('dni')?.touched) {
                  <mat-error>DNI debe tener 8 digitos</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Telefono</mat-label>
                <input matInput formControlName="telefono">
                @if (form.get('telefono')?.hasError('required') && form.get('telefono')?.touched) {
                  <mat-error>Telefono es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
                @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                  <mat-error>Email es requerido</mat-error>
                }
                @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                  <mat-error>Email no valido</mat-error>
                }
              </mat-form-field>
            </div>

            <section class="datos-fiscales">
              <h2>Datos para factura electrónica</h2>
              <p class="form-help">
                Opcional. Complétalos solo si el cliente necesita factura: SUNAT exige RUC,
                razón social y dirección fiscal del receptor.
              </p>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>RUC</mat-label>
                  <input matInput formControlName="ruc" maxlength="11" inputmode="numeric">
                  @if (form.get('ruc')?.hasError('pattern') && form.get('ruc')?.touched) {
                    <mat-error>El RUC debe tener 11 dígitos</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Razón social</mat-label>
                  <input matInput formControlName="razonSocial" maxlength="200">
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Dirección fiscal</mat-label>
                  <input matInput formControlName="direccionFiscal" maxlength="250">
                </mat-form-field>
              </div>
              @if (form.hasError('datosFiscalesIncompletos') && (form.dirty || form.touched)) {
                <p class="form-error" role="alert">
                  Para facturar completa RUC, razón social y dirección fiscal, o deja los tres vacíos.
                </p>
              }
            </section>

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
  styles: `
    .datos-fiscales { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4dfd8; }
    .datos-fiscales h2 { font-size: 1.1rem; margin: 0 0 4px; }
    .form-help { color: #62594e; line-height: 1.5; }
    .form-error { color: #b3261e; margin: 0 0 12px; }
  `
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  id = input<string>();
  loading = signal(false);

  form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    telefono: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ruc: ['', Validators.pattern(/^\d{11}$/)],
    razonSocial: ['', Validators.maxLength(200)],
    direccionFiscal: ['', Validators.maxLength(250)]
  }, { validators: datosFiscalesCompletos });

  ngOnInit() {
    if (this.id()) {
      this.cargarCliente();
    }
  }

  cargarCliente() {
    this.clienteService.obtener(+this.id()!).subscribe(cliente => {
      this.form.patchValue({
        ...cliente,
        ruc: cliente.ruc ?? '',
        razonSocial: cliente.razonSocial ?? '',
        direccionFiscal: cliente.direccionFiscal ?? ''
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const value = this.form.getRawValue();
    const cliente = {
      ...value,
      ruc: value.ruc.trim() || null,
      razonSocial: value.razonSocial.trim() || null,
      direccionFiscal: value.direccionFiscal.trim() || null
    };

    const operacion = this.id()
      ? this.clienteService.actualizar(+this.id()!, cliente)
      : this.clienteService.crear(cliente);

    operacion.subscribe({
      next: () => {
        this.snackBar.open(
          `Cliente ${this.id() ? 'actualizado' : 'creado'} exitosamente`,
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/clientes']);
      },
      error: () => this.loading.set(false)
    });
  }

  cancelar() {
    this.router.navigate(['/clientes']);
  }
}
