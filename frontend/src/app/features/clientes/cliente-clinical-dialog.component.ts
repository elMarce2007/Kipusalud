import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClienteService, InformacionClinica } from '../../services/cliente.service';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente-clinical-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      Ficha clínica
      <span>{{ cliente.nombres }} {{ cliente.apellidos }}</span>
    </h2>
    <mat-dialog-content>
      <p class="privacy-note">
        <mat-icon>health_and_safety</mat-icon>
        Información confidencial. El acceso queda registrado.
      </p>

      @if (error()) {
        <div class="auth-error" role="alert">{{ error() }}</div>
      }

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Diagnósticos</mat-label>
          <textarea matInput rows="3" formControlName="diagnosticos"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tratamientos</mat-label>
          <textarea matInput rows="3" formControlName="tratamientos"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Alergias</mat-label>
          <textarea matInput rows="2" formControlName="alergias"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Medicamentos</mat-label>
          <textarea matInput rows="3" formControlName="medicamentos"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="saving()" (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" type="button" [disabled]="saving()" (click)="guardar()">
        <mat-icon>save</mat-icon> Guardar ficha
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2 span { display: block; margin-top: 5px; color: var(--kipu-muted); font: 400 14px "DM Sans", sans-serif; }
    .privacy-note { display: flex; align-items: center; gap: 8px; margin: 0 0 18px; color: var(--kipu-green); font-size: 12px; }
    .privacy-note mat-icon { width: 19px; height: 19px; font-size: 19px; }
    mat-dialog-content { min-width: min(520px, 78vw); }
    textarea { resize: vertical; }
  `
})
export class ClienteClinicalDialogComponent {
  readonly cliente = inject<Cliente>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ClienteClinicalDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);

  saving = signal(false);
  error = signal<string | null>(null);
  form = this.fb.nonNullable.group({
    diagnosticos: [''],
    tratamientos: [''],
    alergias: [''],
    medicamentos: ['']
  });

  constructor() {
    if (!this.cliente.id) {
      this.error.set('No se pudo identificar al cliente.');
      return;
    }

    this.clienteService.obtenerInformacionClinica(this.cliente.id).subscribe({
      next: info => this.form.patchValue(info),
      error: err => {
        console.error('No se pudo cargar la ficha clínica.', err);
        this.error.set('No se pudo cargar la ficha clínica. Verifica tus permisos y vuelve a intentarlo.');
      }
    });
  }

  guardar() {
    if (!this.cliente.id || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    this.clienteService.guardarInformacionClinica(
      this.cliente.id,
      this.form.getRawValue() as InformacionClinica
    ).subscribe({
      next: saved => this.dialogRef.close(saved),
      error: err => {
        console.error('No se pudo guardar la ficha clínica.', err);
        this.saving.set(false);
        this.error.set('No se pudo guardar la ficha. Inténtalo de nuevo.');
      }
    });
  }
}
