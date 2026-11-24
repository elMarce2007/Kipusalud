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

import { PersonalService } from '../../../services/personal.service';
import { Personal, TURNOS, Turno } from '../../../models/personal.model';

@Component({
  selector: 'app-personal-form',
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
          <mat-card-title>{{ id() ? 'Editar' : 'Nuevo' }} colaborador</mat-card-title>
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
                <mat-label>Cargo</mat-label>
                <input matInput formControlName="cargo">
                @if (form.get('cargo')?.hasError('required') && form.get('cargo')?.touched) {
                  <mat-error>Cargo es requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
                @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                  <mat-error>Email es requerido</mat-error>
                }
                @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                  <mat-error>Email no válido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>DNI</mat-label>
                <input matInput formControlName="dni" maxlength="8" inputmode="numeric">
                @if (form.controls.dni.hasError('pattern')) {
                  <mat-error>El DNI tiene 8 dígitos</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="telefono" maxlength="20" inputmode="tel">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>N.° de colegiatura (CQFP)</mat-label>
                <input matInput formControlName="colegiatura" maxlength="20">
                <mat-hint>Para químicos farmacéuticos (regente o asistente)</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Turno</mat-label>
                <mat-select formControlName="turno">
                  <mat-option [value]="null">Sin turno asignado</mat-option>
                  @for (t of turnos; track t.valor) {
                    <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <label class="estado">
                <input type="checkbox" formControlName="activo">
                Colaborador activo
              </label>
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
  styles: `
    .estado { display: flex; align-items: center; gap: 10px; }
    .estado input { width: 18px; height: 18px; }
  `
})
export class PersonalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private personalService = inject(PersonalService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  id = input<string>();
  loading = signal(false);

  form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    cargo: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    dni: ['', Validators.pattern(/^\d{8}$/)],
    telefono: ['', Validators.maxLength(20)],
    colegiatura: ['', Validators.maxLength(20)],
    turno: this.fb.control<Turno | null>(null),
    activo: [true]
  });
  readonly turnos = TURNOS;

  ngOnInit() {
    if (this.id()) {
      this.cargarPersonal();
    }
  }

  cargarPersonal() {
    this.personalService.obtener(+this.id()!).subscribe(personal => {
      this.form.patchValue({
        nombres: personal.nombres,
        apellidos: personal.apellidos,
        cargo: personal.cargo,
        email: personal.email,
        dni: personal.dni ?? '',
        telefono: personal.telefono ?? '',
        colegiatura: personal.colegiatura ?? '',
        turno: personal.turno ?? null,
        activo: personal.activo ?? true
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const v = this.form.getRawValue();
    const personal: Personal = {
      ...v,
      dni: v.dni.trim() || null,
      telefono: v.telefono.trim() || null,
      colegiatura: v.colegiatura.trim() || null
    };

    const operacion = this.id()
      ? this.personalService.actualizar(+this.id()!, personal)
      : this.personalService.crear(personal);

    operacion.subscribe({
      next: () => {
        this.snackBar.open(
          `Personal ${this.id() ? 'actualizado' : 'creado'} exitosamente`,
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/personal']);
      },
      error: err => {
        this.loading.set(false);
        if (err?.status === 409) {
          this.snackBar.open('Ya existe un colaborador con ese DNI.', 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  cancelar() {
    this.router.navigate(['/personal']);
  }
}
