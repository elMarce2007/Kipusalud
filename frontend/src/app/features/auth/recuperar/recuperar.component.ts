import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { FortalezaPasswordComponent } from '../../../shared/components/fortaleza-password/fortaleza-password.component';

const coinciden = (grupo: AbstractControl): ValidationErrors | null =>
  grupo.get('nuevaPassword')?.value === grupo.get('confirmacion')?.value ? null : { noCoinciden: true };

/**
 * Recuperación de acceso (ECU03): el colaborador ingresa el código de 6 dígitos que le
 * entregó el administrador de su farmacia y define una nueva contraseña.
 */
@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FortalezaPasswordComponent
  ],
  template: `
    <div class="auth-container">
      <section class="auth-story">
        <a class="auth-brand" routerLink="/">
          <mat-icon>local_pharmacy</mat-icon>
          <span>KipuSalud</span>
        </a>
        <p class="auth-eyebrow">Recuperación de acceso</p>
        <h1>Restablece tu<br><em>contraseña.</em></h1>
        <ol class="pasos">
          <li><strong>Pide un código</strong> al administrador de tu farmacia. Lo genera desde Usuarios.</li>
          <li><strong>Ingrésalo aquí</strong> antes de 15 minutos. Sirve una sola vez y se bloquea tras 5 intentos.</li>
          <li><strong>Define tu nueva contraseña</strong> y vuelve a iniciar sesión.</li>
        </ol>
        <div class="auth-quipu" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
          <i></i>
        </div>
      </section>

      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title><h2>Restablecer contraseña</h2></mat-card-title>
          <mat-card-subtitle>Con el código que te entregó tu administrador.</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (listo()) {
            <div class="codigo-creado" role="status">
              <h3>Contraseña actualizada</h3>
              <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button mat-raised-button color="primary" type="button" class="full-width" (click)="irALogin()">
                Ir a iniciar sesión
              </button>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="enviar()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Código de farmacia</mat-label>
                <input matInput formControlName="farmaciaCodigo" autocomplete="organization">
                <mat-icon matPrefix>qr_code_2</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre de usuario</mat-label>
                <input matInput formControlName="username" autocomplete="username">
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width codigo">
                <mat-label>Código de recuperación (6 dígitos)</mat-label>
                <input matInput formControlName="codigo" inputmode="numeric" maxlength="6"
                       autocomplete="one-time-code">
                <mat-icon matPrefix>pin</mat-icon>
                @if (form.controls.codigo.hasError('pattern') && form.controls.codigo.touched) {
                  <mat-error>El código tiene 6 dígitos</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nueva contraseña</mat-label>
                <input matInput [type]="oculta() ? 'password' : 'text'" formControlName="nuevaPassword"
                       autocomplete="new-password">
                <mat-icon matPrefix>key</mat-icon>
                <button mat-icon-button matSuffix type="button" aria-label="Mostrar u ocultar contraseña"
                        (click)="oculta.set(!oculta())">
                  <mat-icon>{{ oculta() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar contraseña</mat-label>
                <input matInput [type]="oculta() ? 'password' : 'text'" formControlName="confirmacion"
                       autocomplete="new-password">
                <mat-icon matPrefix>lock_reset</mat-icon>
              </mat-form-field>
              @if (form.hasError('noCoinciden') && form.controls.confirmacion.touched) {
                <p class="aviso" role="alert">Las contraseñas no coinciden.</p>
              }

              <app-fortaleza-password [password]="nueva() ?? ''" />

              <button mat-raised-button color="primary" type="submit" class="full-width"
                      [disabled]="cargando() || form.invalid">
                @if (cargando()) { <mat-spinner diameter="20"></mat-spinner> } @else { Restablecer contraseña }
              </button>
            </form>
          }
        </mat-card-content>

        <mat-card-actions>
          <span>¿La recordaste?</span>
          <a mat-button routerLink="/auth/login">Iniciar sesión</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .pasos { margin: 24px 0; padding-left: 20px; line-height: 1.6; color: inherit; opacity: .9; }
    .pasos li + li { margin-top: 8px; }
    .codigo input { letter-spacing: .5em; font: 600 20px "Space Grotesk", sans-serif; }
    .aviso { margin: -8px 0 12px; color: var(--kipu-danger-fg); font-size: 13px; }
  `
})
export class RecuperarComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  cargando = signal(false);
  listo = signal(false);
  oculta = signal(true);

  form = this.fb.nonNullable.group({
    farmaciaCodigo: ['', Validators.required],
    username: ['', Validators.required],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    nuevaPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    confirmacion: ['', Validators.required]
  }, { validators: coinciden });

  nueva = toSignal(this.form.controls.nuevaPassword.valueChanges);

  enviar() {
    if (this.form.invalid || this.cargando()) return;
    const v = this.form.getRawValue();
    this.cargando.set(true);
    this.authService.recuperarPassword({
      farmaciaCodigo: v.farmaciaCodigo.trim(),
      username: v.username.trim(),
      codigo: v.codigo.trim(),
      nuevaPassword: v.nuevaPassword
    }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.listo.set(true);
        this.snackBar.open('Contraseña actualizada.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.cargando.set(false);
        this.form.controls.codigo.reset('');
      }
    });
  }

  irALogin() {
    this.router.navigate(['/auth/login']);
  }
}
