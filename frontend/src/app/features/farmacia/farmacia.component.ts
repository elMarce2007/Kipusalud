import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-farmacia',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Datos de la botica</p>
          <h1>Farmacia</h1>
        </div>
      </div>

      <mat-card class="farmacia-card">
        <mat-card-header>
          <mat-card-title>Información de la farmacia</mat-card-title>
          <mat-card-subtitle>
            El acceso de lectura está disponible para el equipo; los cambios dependen de la delegación del Administrador.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (error()) {
            <div class="load-error" role="alert">
              <mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
            </div>
          }
          @if (mensaje()) {
            <p class="success-message" role="status">{{ mensaje() }}</p>
          }
          <form [formGroup]="form" (ngSubmit)="guardar()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de la farmacia</mat-label>
              <input matInput formControlName="nombre" maxlength="120">
              <mat-icon matPrefix>local_pharmacy</mat-icon>
              @if (form.controls.nombre.hasError('required') && form.controls.nombre.touched) {
                <mat-error>El nombre es obligatorio.</mat-error>
              }
            </mat-form-field>
            @if (puedeEditar) {
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> Guardar cambios</ng-container>
                }
              </button>
            } @else {
              <p class="readonly-note">Tu perfil puede consultar esta información, pero no modificarla.</p>
            }
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .farmacia-card { max-width: 720px; }
    mat-card-header { padding: 20px 20px 0; }
    mat-card-title { font: 500 18px Georgia, "Times New Roman", serif; }
    mat-card-content { padding: 20px; }
    .readonly-note { margin: 14px 0 0; color: var(--kipu-muted); }
    .success-message { padding: 12px 16px; background: #e5eee3; color: #315a3d; border-radius: 8px; }
  `
})
export class FarmaciaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly puedeEditar = this.authService.hasPermission('FARMACIA:EDITAR');

  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  saving = signal(false);
  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]]
  });

  ngOnInit() {
    this.authService.obtenerFarmacia().subscribe({
      next: farmacia => this.form.controls.nombre.setValue(farmacia.nombre),
      error: err => {
        console.error('No se pudo cargar la información de la farmacia.', err);
        this.error.set('No se pudo cargar la información de la farmacia.');
      }
    });
    if (!this.puedeEditar) this.form.disable();
  }

  guardar() {
    if (this.form.invalid || this.saving() || !this.puedeEditar) return;
    this.saving.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    this.authService.actualizarFarmacia(this.form.controls.nombre.value).subscribe({
      next: farmacia => {
        this.form.controls.nombre.setValue(farmacia.nombre);
        this.saving.set(false);
        this.mensaje.set('Los datos de la farmacia se actualizaron.');
      },
      error: err => {
        console.error('No se pudo actualizar la información de la farmacia.', err);
        this.saving.set(false);
        this.error.set('No se pudieron guardar los cambios.');
      }
    });
  }
}
