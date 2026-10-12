import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-container">
      <section class="auth-story">
        <a class="auth-brand" routerLink="/">
          <mat-icon>local_pharmacy</mat-icon>
          <span>KipuSalud</span>
        </a>
        <p class="auth-eyebrow">Un espacio para tu farmacia</p>
        <h1>Empieza con<br><em>orden y cuidado.</em></h1>
        <p class="auth-description">
          Registra tu farmacia y crea su cuenta administradora. Los datos quedarán aislados
          del resto de farmacias.
        </p>
        <div class="auth-quipu" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
          <i></i>
        </div>
        <p class="auth-note">Tu equipo, tus productos, tu información.</p>
      </section>

      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>
            <h2>Crear farmacia</h2>
          </mat-card-title>
          <mat-card-subtitle>El primer usuario será el administrador.</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (error()) {
            <div class="auth-error" role="alert">
              <mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
            </div>
          }

          <form [formGroup]="registroForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de la farmacia</mat-label>
              <input matInput formControlName="farmaciaNombre" autocomplete="organization">
              <mat-icon matPrefix>local_pharmacy</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Usuario administrador</mat-label>
              <input matInput formControlName="username" autocomplete="username">
              <mat-icon matPrefix>person</mat-icon>
              @if (registroForm.get('username')?.hasError('required') && registroForm.get('username')?.touched) {
                <mat-error>El usuario es obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password">
              <mat-icon matPrefix>lock</mat-icon>
              @if (registroForm.get('password')?.hasError('required') && registroForm.get('password')?.touched) {
                <mat-error>La contraseña es obligatoria</mat-error>
              }
              @if (registroForm.get('password')?.hasError('minlength') && registroForm.get('password')?.touched) {
                <mat-error>Usa al menos 12 caracteres</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary"
                    type="submit"
                    class="full-width"
                    [disabled]="loading() || registroForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Crear farmacia
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <span>¿Ya tienes una cuenta?</span>
          <a mat-button routerLink="/auth/login">Iniciar sesión</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: ``
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  error = signal<string | null>(null);

  registroForm = this.fb.nonNullable.group({
    farmaciaNombre: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]]
  });

  onSubmit() {
    if (this.registroForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.registro(this.registroForm.getRawValue()).subscribe({
      next: () => {
        this.snackBar.open('Farmacia y cuenta de administración creadas', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err: { status?: number }) => {
        this.loading.set(false);
        this.error.set(err.status === 409
          ? 'Ese nombre de usuario ya está en uso.'
          : 'No se pudo registrar la farmacia. Verifica los datos e inténtalo de nuevo.');
      }
    });
  }
}
