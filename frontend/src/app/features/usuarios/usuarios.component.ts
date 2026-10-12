import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { AuthService, UsuarioFarmacia } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Acceso al sistema</p>
          <h1>Usuarios de la farmacia</h1>
        </div>
      </div>

      <p class="users-intro">
        Crea credenciales para el personal que utilizará KipuSalud. Las cuentas nuevas tienen el rol
        Empleado; sus datos laborales se administran por separado en el módulo Personal.
      </p>

      @if (error()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
          <button mat-stroked-button type="button" (click)="cargarUsuarios()">Reintentar</button>
        </div>
      }

      <div class="users-grid">
        <mat-card class="create-card">
          <mat-card-header>
            <mat-card-title>Nueva cuenta de empleado</mat-card-title>
            <mat-card-subtitle>El rol de empleado se asigna automáticamente.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="crearUsuario()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre de usuario</mat-label>
                <input matInput formControlName="username" autocomplete="off">
                <mat-icon matPrefix>person</mat-icon>
                @if (form.controls.username.hasError('pattern') && form.controls.username.touched) {
                  <mat-error>Usa 3 a 50 letras, números, puntos, guiones o guiones bajos.</mat-error>
                }
                @if (form.controls.username.hasError('required') && form.controls.username.touched) {
                  <mat-error>El usuario es obligatorio.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contraseña temporal</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password">
                <mat-icon matPrefix>lock</mat-icon>
                @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
                  <mat-error>Usa al menos 12 caracteres.</mat-error>
                }
              </mat-form-field>

              <button mat-raised-button color="primary" class="full-width" type="submit"
                      [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>person_add</mat-icon> Crear cuenta</ng-container>
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="user-list-card">
          <mat-card-header>
            <mat-card-title>Cuentas registradas</mat-card-title>
            <mat-card-subtitle>{{ usuarios().length }} usuarios de esta farmacia</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="usuarios()" class="full-width">
              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef>Usuario</th>
                <td mat-cell *matCellDef="let user">{{ user.username }}</td>
              </ng-container>
              <ng-container matColumnDef="rol">
                <th mat-header-cell *matHeaderCellDef>Rol</th>
                <td mat-cell *matCellDef="let user">{{ rolLabel(user.rol) }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let user">
                  <span class="account-state" [class.inactive]="!user.activo">
                    {{ user.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
              <tr *matNoDataRow>
                <td class="empty-state" colspan="3">Aún no hay cuentas de usuario.</td>
              </tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .users-intro { max-width: 760px; margin: -10px 0 24px; color: var(--kipu-muted); line-height: 1.7; }
    .users-grid { display: grid; grid-template-columns: minmax(270px, .7fr) minmax(400px, 1.3fr); gap: 20px; align-items: start; }
    mat-card-header { padding: 20px 20px 0; }
    mat-card-title { font: 500 18px Georgia, "Times New Roman", serif; }
    mat-card-content { padding: 18px 20px 20px; }
    .account-state { display: inline-block; padding: 4px 9px; border-radius: 20px; background: #e5eee3; color: #456b53; font-size: 11px; }
    .account-state.inactive { background: #f4e3dc; color: #8e382a; }
    .empty-state { padding: 20px; color: var(--kipu-muted); text-align: center; }
    @media (max-width: 900px) { .users-grid { grid-template-columns: 1fr; } }
  `
})
export class UsuariosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  usuarios = signal<UsuarioFarmacia[]>([]);
  error = signal<string | null>(null);
  saving = signal(false);
  columns = ['username', 'rol', 'estado'];
  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]]
  });

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.error.set(null);
    this.authService.listarUsuarios().subscribe({
      next: users => this.usuarios.set(users),
      error: err => {
        console.error('No se pudo cargar la lista de usuarios.', err);
        this.error.set('No se pudieron cargar las cuentas de la farmacia.');
      }
    });
  }

  crearUsuario() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.authService.crearUsuario(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset();
        this.saving.set(false);
        this.cargarUsuarios();
      },
      error: (err: { status?: number }) => {
        console.error('No se pudo crear la cuenta de usuario.', err);
        this.saving.set(false);
        this.error.set(err.status === 409
          ? 'Ese nombre de usuario ya está en uso.'
          : 'No se pudo crear la cuenta. Verifica tus permisos y vuelve a intentarlo.');
      }
    });
  }

  rolLabel(rol: string): string {
    return rol === 'ADMINISTRADOR' ? 'Administrador'
      : rol === 'QF_REGENTE' ? 'Q.F. regente'
        : 'Empleado';
  }
}
