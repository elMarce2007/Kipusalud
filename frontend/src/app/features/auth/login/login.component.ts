import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
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
        <p class="auth-eyebrow">Gestión farmacéutica, con identidad peruana</p>
        <h1>Tu farmacia,<br><em>en equilibrio.</em></h1>
        <p class="auth-description">
          Organiza clientes, productos, ventas y equipo desde un solo espacio para tu farmacia.
        </p>
        <div class="auth-quipu" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
          <i></i>
        </div>
        <p class="auth-note">Orden para cuidar mejor.</p>
      </section>

      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>
            <h2>Bienvenido de nuevo</h2>
          </mat-card-title>
          <mat-card-subtitle>Ingresa a tu espacio de farmacia</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loginError()) {
            <div class="auth-error" role="alert">
              <mat-icon>error_outline</mat-icon>
              <span>{{ loginError() }}</span>
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Código de farmacia</mat-label>
              <input matInput formControlName="farmaciaCodigo" autocomplete="organization">
              <mat-icon matPrefix>qr_code_2</mat-icon>
              @if (loginForm.get('farmaciaCodigo')?.hasError('required')
                && loginForm.get('farmaciaCodigo')?.touched) {
                <mat-error>El código de farmacia es obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de usuario</mat-label>
              <input matInput formControlName="username" autocomplete="username">
              <mat-icon matPrefix>person</mat-icon>
              @if (loginForm.get('username')?.hasError('required') && loginForm.get('username')?.touched) {
                <mat-error>El nombre de usuario es obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput
                     [type]="hidePassword() ? 'password' : 'text'"
                     formControlName="password"
                     autocomplete="current-password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button"
                      (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>La contraseña es obligatoria</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary"
                    type="submit"
                    class="full-width"
                    [disabled]="loading() || loginForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Iniciar sesión
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <span>¿Aún no tienes farmacia?</span>
          <a mat-button routerLink="/auth/registro">Registrar farmacia</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: ``
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  hidePassword = signal(true);
  loading = signal(false);
  loginError = signal<string | null>(null);

  loginForm = this.fb.nonNullable.group({
    farmaciaCodigo: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.loginError.set(null);
    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: { status?: number }) => {
        this.loading.set(false);
        this.loginError.set(error.status === 401
          ? 'Código de farmacia, usuario o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Verifica tu conexión e inténtalo de nuevo.');
      }
    });
  }
}
