import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AuthService, UsuarioFarmacia } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
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
        Crea cuentas según la responsabilidad de cada persona. Empleado y Cajero comparten el
        mismo perfil. Las delegaciones del Gerente/Supervisor las define el Administrador.
      </p>

      @if (error()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon><span>{{ error() }}</span>
          <button mat-stroked-button type="button" (click)="cargarUsuarios()">Reintentar</button>
        </div>
      }

      @if (mensaje()) {
        <p class="success-message" role="status">{{ mensaje() }}</p>
      }

      <div class="users-grid">
        <mat-card class="create-card">
          <mat-card-header>
            <mat-card-title>Nueva cuenta</mat-card-title>
            <mat-card-subtitle>La contraseña debe tener entre 12 y 72 caracteres.</mat-card-subtitle>
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

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Perfil</mat-label>
                <mat-select formControlName="rol">
                  @for (role of availableRoles; track role.value) {
                    <mat-option [value]="role.value">{{ role.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (form.controls.rol.value === 'GERENTE_SUPERVISOR') {
                <div class="delegation-options">
                  <p>Delegaciones para este gerente</p>
                  <mat-checkbox formControlName="editarFarmacia">
                    Modificar el nombre de la Botica
                  </mat-checkbox>
                  <mat-checkbox formControlName="gestionarUsuarios">
                    Administrar cuentas de Empleado/Cajero
                  </mat-checkbox>
                </div>
              }

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
            <div class="table-wrap">
              <table mat-table [dataSource]="usuarios()" class="full-width">
                <ng-container matColumnDef="username">
                  <th mat-header-cell *matHeaderCellDef>Usuario</th>
                  <td mat-cell *matCellDef="let user">{{ user.username }}</td>
                </ng-container>
                <ng-container matColumnDef="rol">
                  <th mat-header-cell *matHeaderCellDef>Perfil</th>
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
                <ng-container matColumnDef="delegaciones">
                  <th mat-header-cell *matHeaderCellDef>Delegaciones gerente</th>
                  <td mat-cell *matCellDef="let user">
                    @if (user.rol === 'GERENTE_SUPERVISOR' && authService.userRole() === 'ADMINISTRADOR') {
                      <div class="manager-grants">
                        <mat-checkbox [checked]="hasGrant(user.id, 'FARMACIA:EDITAR')"
                                      (change)="setGrant(user.id, 'FARMACIA:EDITAR', $event.checked)">
                          Editar Botica
                        </mat-checkbox>
                        <mat-checkbox [checked]="hasGrant(user.id, 'USUARIOS:GESTIONAR')"
                                      (change)="setGrant(user.id, 'USUARIOS:GESTIONAR', $event.checked)">
                          Gestionar usuarios
                        </mat-checkbox>
                      </div>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let user">
                    @if (user.rol !== 'ADMINISTRADOR') {
                      <div class="actions">
                        @if (user.rol === 'GERENTE_SUPERVISOR' && authService.userRole() === 'ADMINISTRADOR') {
                          <button mat-stroked-button type="button" [disabled]="savingUserId() === user.id"
                                  (click)="guardarDelegaciones(user)">
                            Guardar permisos
                          </button>
                        }
                        <button mat-button type="button" [disabled]="savingUserId() === user.id"
                                (click)="cambiarEstado(user)">
                          {{ user.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      </div>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns"></tr>
                <tr *matNoDataRow>
                  <td class="empty-state" colspan="5">Aún no hay cuentas de usuario.</td>
                </tr>
              </table>
            </div>
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
    .delegation-options, .manager-grants { display: grid; gap: 6px; margin: 0 0 16px; }
    .delegation-options p { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
    .table-wrap { overflow-x: auto; }
    table { min-width: 720px; }
    .actions { display: grid; gap: 4px; justify-items: start; }
    .account-state { display: inline-block; padding: 4px 9px; border-radius: 20px; background: #e5eee3; color: #456b53; font-size: 11px; }
    .account-state.inactive { background: #f4e3dc; color: #8e382a; }
    .empty-state { padding: 20px; color: var(--kipu-muted); text-align: center; }
    .success-message { padding: 12px 16px; background: #e5eee3; color: #315a3d; border-radius: 8px; }
    .muted { color: var(--kipu-muted); }
    @media (max-width: 900px) { .users-grid { grid-template-columns: 1fr; } }
  `
})
export class UsuariosComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  usuarios = signal<UsuarioFarmacia[]>([]);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  saving = signal(false);
  savingUserId = signal<number | null>(null);
  managerGrants = signal<Record<number, string[]>>({});
  columns = ['username', 'rol', 'estado', 'delegaciones', 'acciones'];
  availableRoles = [
    { value: 'EMPLEADO', label: 'Empleado / Cajero' },
    { value: 'QF_REGENTE', label: 'Q.F. regente' },
    { value: 'GERENTE_SUPERVISOR', label: 'Gerente / Supervisor' }
  ];
  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    rol: ['EMPLEADO', Validators.required],
    editarFarmacia: [true],
    gestionarUsuarios: [false]
  });

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.error.set(null);
    this.authService.listarUsuarios().subscribe({
      next: users => {
        this.usuarios.set(users);
        this.managerGrants.set(Object.fromEntries(users
          .filter(user => user.rol === 'GERENTE_SUPERVISOR')
          .map(user => [user.id, user.permisos.filter(permission =>
            permission === 'FARMACIA:EDITAR' || permission === 'USUARIOS:GESTIONAR')])));
      },
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
    this.mensaje.set(null);
    const { username, password, rol, editarFarmacia, gestionarUsuarios } = this.form.getRawValue();
    const permisos = rol === 'GERENTE_SUPERVISOR'
      ? [
          ...(editarFarmacia ? ['FARMACIA:EDITAR'] : []),
          ...(gestionarUsuarios ? ['USUARIOS:GESTIONAR'] : [])
        ]
      : [];
    this.authService.crearUsuario({ username, password, rol, permisos }).subscribe({
      next: () => {
        this.form.reset({
          username: '',
          password: '',
          rol: 'EMPLEADO',
          editarFarmacia: true,
          gestionarUsuarios: false
        });
        this.saving.set(false);
        this.mensaje.set('La cuenta se creó correctamente.');
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

  hasGrant(id: number, permission: string): boolean {
    return this.managerGrants()[id]?.includes(permission) ?? false;
  }

  setGrant(id: number, permission: string, enabled: boolean) {
    const current = this.managerGrants()[id] ?? [];
    const next = enabled
      ? [...new Set([...current, permission])]
      : current.filter(value => value !== permission);
    this.managerGrants.update(grants => ({ ...grants, [id]: next }));
  }

  guardarDelegaciones(user: UsuarioFarmacia) {
    this.actualizar(user, user.activo, this.managerGrants()[user.id] ?? []);
  }

  cambiarEstado(user: UsuarioFarmacia) {
    this.actualizar(user, !user.activo, this.managerGrants()[user.id] ?? []);
  }

  rolLabel(rol: string): string {
    return rol === 'ADMINISTRADOR' ? 'Administrador'
      : rol === 'GERENTE_SUPERVISOR' ? 'Gerente / Supervisor'
        : rol === 'QF_REGENTE' ? 'Q.F. regente'
          : 'Empleado / Cajero';
  }

  private actualizar(user: UsuarioFarmacia, activo: boolean, permisos: string[]) {
    this.savingUserId.set(user.id);
    this.error.set(null);
    this.mensaje.set(null);
    this.authService.actualizarUsuario(user.id, {
      rol: user.rol,
      activo,
      permisos: user.rol === 'GERENTE_SUPERVISOR' ? permisos : []
    }).subscribe({
      next: () => {
        this.savingUserId.set(null);
        this.mensaje.set(!activo
          ? 'Cuenta desactivada: no podrá iniciar sesión de nuevo. Las sesiones vigentes pueden seguir funcionando hasta que expire su token (máximo 24 horas).'
          : 'Cambios guardados. Las nuevas delegaciones se aplicarán cuando el usuario vuelva a iniciar sesión.');
        this.cargarUsuarios();
      },
      error: err => {
        console.error('No se pudo actualizar la cuenta de usuario.', err);
        this.savingUserId.set(null);
        this.error.set('No se pudieron guardar los cambios de la cuenta.');
      }
    });
  }
}
