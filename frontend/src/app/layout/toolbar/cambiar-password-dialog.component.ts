import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { FortalezaPasswordComponent } from '../../shared/components/fortaleza-password/fortaleza-password.component';

const coinciden = (grupo: AbstractControl): ValidationErrors | null =>
  grupo.get('nuevaPassword')?.value === grupo.get('confirmacion')?.value ? null : { noCoinciden: true };

/** Cambio de la propia contraseña desde el menú de usuario. */
@Component({
  selector: 'app-cambiar-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    FortalezaPasswordComponent],
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contraseña actual</mat-label>
          <input matInput type="password" formControlName="passwordActual" autocomplete="current-password">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nueva contraseña</mat-label>
          <input matInput type="password" formControlName="nuevaPassword" autocomplete="new-password">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmar nueva contraseña</mat-label>
          <input matInput type="password" formControlName="confirmacion" autocomplete="new-password">
        </mat-form-field>
        @if (form.hasError('noCoinciden') && form.controls.confirmacion.touched) {
          <p class="aviso" role="alert">Las contraseñas no coinciden.</p>
        }
        <app-fortaleza-password [password]="nueva() ?? ''" />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || guardando()">
          Guardar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content { min-width: min(420px, 80vw); }
    .aviso { margin: -8px 0 12px; color: var(--kipu-danger-fg); font-size: 13px; }
  `
})
export class CambiarPasswordDialogComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<CambiarPasswordDialogComponent>);
  private snackBar = inject(MatSnackBar);

  guardando = signal(false);
  form = this.fb.nonNullable.group({
    passwordActual: ['', Validators.required],
    nuevaPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    confirmacion: ['', Validators.required]
  }, { validators: coinciden });
  nueva = toSignal(this.form.controls.nuevaPassword.valueChanges);

  guardar() {
    if (this.form.invalid || this.guardando()) return;
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.authService.cambiarPassword(v.passwordActual, v.nuevaPassword).subscribe({
      next: () => {
        this.snackBar.open('Contraseña actualizada.', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => this.guardando.set(false)
    });
  }
}
