import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { FacturacionService } from '../../services/facturacion.service';
import {
  EmisorComprobante,
  SERIE_BOLETA_INICIAL,
  SERIE_FACTURA_INICIAL,
  SunatConfiguracion
} from '../../models/facturacion.model';
import { MatSnackBar } from '@angular/material/snack-bar';

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
          <div class="codigo-farmacia">
            <span class="codigo-label">Código para iniciar sesión</span>
            <strong>{{ codigo() || 'Cargando…' }}</strong>
            <p>Comparte este identificador con el personal de la farmacia. No reemplaza el usuario ni la contraseña.</p>
          </div>
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

      <mat-card class="farmacia-card">
        <mat-card-header>
          <mat-card-title>Datos de la empresa</mat-card-title>
          <mat-card-subtitle>
            Razón social, RUC y contacto. Aparecen como emisor en boletas y facturas.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (cargandoEmpresa()) {
            <p role="status">Cargando datos de la empresa…</p>
          } @else if (puedeEditarEmpresa) {
            @if (mensajeEmpresa()) {
              <p class="success-message" role="status">{{ mensajeEmpresa() }}</p>
            }
            <form [formGroup]="empresaForm" (ngSubmit)="guardarEmpresa()">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Razón social</mat-label>
                  <input matInput formControlName="razonSocial" maxlength="150">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>RUC</mat-label>
                  <input matInput formControlName="ruc" maxlength="11" inputmode="numeric">
                  @if (empresaForm.controls.ruc.invalid && empresaForm.controls.ruc.touched) {
                    <mat-error>El RUC debe tener 11 dígitos</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Dirección fiscal</mat-label>
                  <input matInput formControlName="direccionFiscal" maxlength="255">
                  <mat-icon matPrefix>location_on</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Departamento</mat-label>
                  <input matInput formControlName="departamento" maxlength="100">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Provincia</mat-label>
                  <input matInput formControlName="provincia" maxlength="100">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Distrito</mat-label>
                  <input matInput formControlName="distrito" maxlength="100">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ubigeo</mat-label>
                  <input matInput formControlName="ubigeo" maxlength="6" inputmode="numeric">
                  <mat-hint>6 dígitos del INEI, por ejemplo 150101</mat-hint>
                  @if (empresaForm.controls.ubigeo.invalid && empresaForm.controls.ubigeo.touched) {
                    <mat-error>El ubigeo debe tener 6 dígitos</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" maxlength="30" inputmode="tel">
                  <mat-icon matPrefix>call</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Correo</mat-label>
                  <input matInput type="email" formControlName="email" maxlength="120">
                  <mat-icon matPrefix>mail</mat-icon>
                  @if (empresaForm.controls.email.invalid && empresaForm.controls.email.touched) {
                    <mat-error>Correo no válido</mat-error>
                  }
                </mat-form-field>
              </div>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="guardandoEmpresa() || empresaForm.invalid">
                @if (guardandoEmpresa()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> Guardar datos de la empresa</ng-container>
                }
              </button>
              <p class="readonly-note">
                Las series de comprobantes y las credenciales SUNAT se configuran en Administración.
              </p>
            </form>
          } @else if (emisor()) {
            <dl class="empresa-lectura">
              <dt>Razón social</dt><dd>{{ emisor()!.razonSocial }}</dd>
              <dt>RUC</dt><dd>{{ emisor()!.ruc }}</dd>
              <dt>Dirección fiscal</dt><dd>{{ emisor()!.direccionFiscal }}</dd>
              <dt>Teléfono</dt><dd>{{ emisor()!.telefono || '—' }}</dd>
              <dt>Correo</dt><dd>{{ emisor()!.email || '—' }}</dd>
            </dl>
            <p class="readonly-note">Solo el Administrador o el Q.F. regente pueden modificar estos datos.</p>
          } @else {
            <p class="readonly-note">
              Aún no se registraron los datos de la empresa. Pide al Administrador o al Q.F. regente que los completen.
            </p>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .farmacia-card { max-width: 720px; margin-bottom: 16px; }
    .empresa-lectura { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; }
    .empresa-lectura dt { color: var(--kipu-muted); }
    .empresa-lectura dd { margin: 0; overflow-wrap: anywhere; }
    mat-card-header { padding: 20px 20px 0; }
    mat-card-title { font: 500 18px Georgia, "Times New Roman", serif; }
    mat-card-content { padding: 20px; }
    .codigo-farmacia { display: grid; gap: 8px; margin-bottom: 24px; padding: 16px; background: #f9f3e6; border: 1px solid #e8e2d6; border-radius: 10px; }
    .codigo-label { color: var(--kipu-muted); font-size: 13px; }
    .codigo-farmacia strong { font: 600 18px monospace; overflow-wrap: anywhere; }
    .codigo-farmacia p { margin: 0; color: var(--kipu-muted); }
    .readonly-note { margin: 14px 0 0; color: var(--kipu-muted); }
    .success-message { padding: 12px 16px; background: #c2edce; color: #294e38; border-radius: 8px; }
  `
})
export class FarmaciaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly puedeEditar = this.authService.hasPermission('FARMACIA:EDITAR');

  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  codigo = signal('');
  saving = signal(false);
  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]]
  });

  /** El backend solo permite al Administrador y al Q.F. regente modificar los datos fiscales. */
  readonly puedeEditarEmpresa = ['ADMINISTRADOR', 'QF_REGENTE'].includes(this.authService.userRole());
  private readonly facturacionService = inject(FacturacionService);
  private readonly snackBar = inject(MatSnackBar);
  private perfilActual: SunatConfiguracion | null = null;
  cargandoEmpresa = signal(true);
  guardandoEmpresa = signal(false);
  mensajeEmpresa = signal<string | null>(null);
  emisor = signal<EmisorComprobante | null>(null);

  empresaForm = this.fb.nonNullable.group({
    razonSocial: ['', [Validators.required, Validators.maxLength(150)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    direccionFiscal: ['', [Validators.required, Validators.maxLength(255)]],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    ubigeo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    telefono: ['', Validators.maxLength(30)],
    email: ['', [Validators.email, Validators.maxLength(120)]]
  });

  ngOnInit() {
    this.authService.obtenerFarmacia().subscribe({
      next: farmacia => {
        this.form.controls.nombre.setValue(farmacia.nombre);
        this.codigo.set(farmacia.codigo);
      },
      error: err => {
        console.error('No se pudo cargar la información de la farmacia.', err);
        this.error.set('No se pudo cargar la información de la farmacia.');
      }
    });
    if (!this.puedeEditar) this.form.disable();
    this.cargarEmpresa();
  }

  private cargarEmpresa() {
    if (this.puedeEditarEmpresa) {
      this.facturacionService.obtenerConfiguracion().subscribe({
        next: perfil => {
          this.perfilActual = perfil;
          this.empresaForm.patchValue({
            razonSocial: perfil.razonSocial,
            ruc: perfil.ruc,
            direccionFiscal: perfil.direccionFiscal,
            departamento: perfil.departamento,
            provincia: perfil.provincia,
            distrito: perfil.distrito,
            ubigeo: perfil.ubigeo,
            telefono: perfil.telefono ?? '',
            email: perfil.email ?? ''
          });
          this.cargandoEmpresa.set(false);
        },
        // 404: la farmacia todavía no registró sus datos; el formulario queda vacío.
        error: () => this.cargandoEmpresa.set(false)
      });
    } else {
      // Los demás perfiles ven los datos públicos del emisor (los mismos del comprobante).
      this.facturacionService.obtenerOpciones().subscribe({
        next: opciones => {
          this.emisor.set(opciones.emisor);
          this.cargandoEmpresa.set(false);
        },
        error: () => this.cargandoEmpresa.set(false)
      });
    }
  }

  guardarEmpresa() {
    if (this.empresaForm.invalid || this.guardandoEmpresa() || !this.puedeEditarEmpresa) {
      this.empresaForm.markAllAsTouched();
      return;
    }
    this.guardandoEmpresa.set(true);
    this.mensajeEmpresa.set(null);
    const v = this.empresaForm.getRawValue();
    // Las series se administran en Administración; aquí se conservan las actuales.
    this.facturacionService.guardarPerfil({
      ...v,
      ruc: v.ruc.trim(),
      ubigeo: v.ubigeo.trim(),
      telefono: v.telefono.trim() || null,
      email: v.email.trim() || null,
      serieFactura: this.perfilActual?.serieFactura ?? SERIE_FACTURA_INICIAL,
      serieBoleta: this.perfilActual?.serieBoleta ?? SERIE_BOLETA_INICIAL
    }).subscribe({
      next: perfil => {
        this.perfilActual = perfil;
        this.guardandoEmpresa.set(false);
        this.mensajeEmpresa.set('Los datos de la empresa se actualizaron.');
        this.snackBar.open('Datos de la empresa guardados.', 'OK', { duration: 3000 });
      },
      error: () => this.guardandoEmpresa.set(false)
    });
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
