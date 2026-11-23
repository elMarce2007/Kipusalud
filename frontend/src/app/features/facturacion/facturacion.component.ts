import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  SERIE_BOLETA_INICIAL,
  SERIE_FACTURA_INICIAL,
  SunatConfiguracion
} from '../../models/facturacion.model';
import { FacturacionService } from '../../services/facturacion.service';

const MAX_CERTIFICADO_BYTES = 1_000_000;

/**
 * Administración → series de comprobantes y credenciales SUNAT. Los datos de la empresa
 * (razón social, RUC, dirección, contacto) se editan en el módulo Farmacia.
 */
@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
          <p class="eyebrow">Administración</p>
          <h1>Facturación electrónica SUNAT</h1>
        </div>
        <a mat-button routerLink="/administracion"><mat-icon>arrow_back</mat-icon> Volver</a>
      </div>

      @if (cargando()) {
        <p role="status">Cargando…</p>
      } @else {
        <div class="estado" [class.ok]="habilitado()" role="status">
          <mat-icon>{{ habilitado() ? 'verified' : 'info' }}</mat-icon>
          <div>
            @if (habilitado()) {
              <strong>Boleta electrónica y factura habilitadas</strong>
              <p>El punto de venta ya ofrece los tres comprobantes.</p>
            } @else {
              <strong>Por ahora solo se emite la boleta interna</strong>
              <p>Para ofrecer boleta electrónica y factura, registra los datos de la empresa en Farmacia y aquí las credenciales SUNAT.</p>
            }
          </div>
        </div>

        @if (loadError()) {
          <div class="load-error" role="alert">
            <mat-icon>error_outline</mat-icon><span>{{ loadError() }}</span>
          </div>
        }

        <mat-card class="config-card">
          <mat-card-header>
            <div mat-card-avatar class="paso" [class.hecho]="!!perfil()">1</div>
            <mat-card-title>Series de comprobantes</mat-card-title>
            <mat-card-subtitle>Series autorizadas por SUNAT para boletas y facturas electrónicas.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (!perfil()) {
              <p class="form-help">
                Primero registra los datos de la empresa (razón social, RUC, dirección…) en el módulo Farmacia.
              </p>
              <a mat-raised-button color="primary" routerLink="/farmacia">
                <mat-icon>local_pharmacy</mat-icon> Ir a Farmacia
              </a>
            } @else {
              <p class="form-help">
                Emisor: <strong>{{ perfil()!.razonSocial }}</strong> · RUC {{ perfil()!.ruc }}.
                <a routerLink="/farmacia">Editar datos de la empresa</a>
              </p>
              <form [formGroup]="seriesForm" (ngSubmit)="guardarSeries()">
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Serie de boletas electrónicas</mat-label>
                    <input matInput formControlName="serieBoleta" maxlength="4">
                    <mat-hint>B y tres caracteres, por ejemplo B001</mat-hint>
                    @if (seriesForm.controls.serieBoleta.invalid && seriesForm.controls.serieBoleta.touched) {
                      <mat-error>Usa el formato B001</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Serie de facturas</mat-label>
                    <input matInput formControlName="serieFactura" maxlength="4">
                    <mat-hint>F y tres caracteres, por ejemplo F001</mat-hint>
                    @if (seriesForm.controls.serieFactura.invalid && seriesForm.controls.serieFactura.touched) {
                      <mat-error>Usa el formato F001</mat-error>
                    }
                  </mat-form-field>
                </div>
                @if (cambiaSerie()) {
                  <p class="aviso" role="alert">
                    Al cambiar una serie, la numeración continúa después del último comprobante emitido en ella.
                    Usa solo series autorizadas por SUNAT.
                  </p>
                }
                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit"
                          [disabled]="guardandoPerfil() || seriesForm.invalid">
                    @if (guardandoPerfil()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <ng-container><mat-icon>save</mat-icon> Guardar series</ng-container>
                    }
                  </button>
                </div>
              </form>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="config-card">
          <mat-card-header>
            <div mat-card-avatar class="paso" [class.hecho]="perfil()?.credencialesConfiguradas">2</div>
            <mat-card-title>Credenciales SUNAT</mat-card-title>
            <mat-card-subtitle>
              @if (perfil()?.credencialesConfiguradas) {
                Registradas. Ingrésalas de nuevo solo si quieres reemplazarlas.
              } @else {
                Usuario SOL y certificado digital para firmar y enviar comprobantes.
              }
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (!perfil()) {
              <p class="form-help">Registra primero los datos de la empresa en el módulo Farmacia.</p>
            } @else {
              <form [formGroup]="credencialesForm" (ngSubmit)="guardarCredenciales()">
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Usuario SOL</mat-label>
                    <input matInput formControlName="usuarioSol" autocomplete="off" maxlength="40">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Clave SOL</mat-label>
                    <input matInput type="password" formControlName="claveSol" autocomplete="new-password">
                  </mat-form-field>
                  <div class="certificado">
                    <button mat-stroked-button type="button" (click)="selector.click()">
                      <mat-icon>upload_file</mat-icon> Seleccionar certificado
                    </button>
                    <input #selector type="file" hidden accept=".pfx,.p12,application/x-pkcs12"
                           (change)="leerCertificado($event)">
                    <span class="certificado-nombre">{{ nombreCertificado() || 'Ningún archivo seleccionado (.pfx o .p12)' }}</span>
                    @if (errorCertificado()) {
                      <span class="form-error" role="alert">{{ errorCertificado() }}</span>
                    }
                  </div>
                  <mat-form-field appearance="outline">
                    <mat-label>Contraseña del certificado</mat-label>
                    <input matInput type="password" formControlName="claveCertificado" autocomplete="new-password">
                  </mat-form-field>
                </div>
                <p class="form-help">
                  Se guardan cifradas y no se vuelven a mostrar. Los comprobantes se envían al entorno de
                  SUNAT que tenga configurado el servidor (beta por defecto).
                </p>
                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit"
                          [disabled]="guardandoCredenciales() || credencialesForm.invalid">
                    @if (guardandoCredenciales()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <ng-container><mat-icon>key</mat-icon> Guardar credenciales</ng-container>
                    }
                  </button>
                </div>
              </form>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .config-card { max-width: 900px; margin-bottom: 16px; }
    .form-help { color: #62594e; line-height: 1.5; }
    .form-error { color: #b3261e; }
    .aviso { color: #8a4b00; background: #fff4e0; padding: 8px 12px; border-radius: 6px; }
    .paso {
      display: grid; place-items: center; border-radius: 50%;
      background: #f1ece5; color: #4a4239; font-weight: 600;
    }
    .paso.hecho { background: #e3f1e6; color: #1f5f2e; }
    .estado {
      display: flex; gap: 12px; align-items: flex-start; max-width: 900px;
      padding: 12px 16px; margin-bottom: 16px; border-radius: 8px;
      background: #f6f1ea; border: 1px solid #e4dfd8;
    }
    .estado.ok { background: #eaf4ec; border-color: #b9d8bf; }
    .estado p { margin: 4px 0 0; color: #62594e; }
    .certificado { display: flex; flex-direction: column; gap: 6px; justify-content: center; min-width: 0; }
    .certificado-nombre { color: #62594e; font-size: 13px; overflow-wrap: anywhere; }
  `
})
export class FacturacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);

  perfil = signal<SunatConfiguracion | null>(null);
  cargando = signal(true);
  guardandoPerfil = signal(false);
  guardandoCredenciales = signal(false);
  loadError = signal<string | null>(null);
  nombreCertificado = signal<string | null>(null);
  errorCertificado = signal<string | null>(null);

  seriesForm = this.fb.nonNullable.group({
    serieBoleta: [SERIE_BOLETA_INICIAL, [Validators.required, Validators.pattern(/^[Bb][A-Za-z0-9]{3}$/)]],
    serieFactura: [SERIE_FACTURA_INICIAL, [Validators.required, Validators.pattern(/^[Ff][A-Za-z0-9]{3}$/)]]
  });

  credencialesForm = this.fb.nonNullable.group({
    usuarioSol: ['', Validators.required],
    claveSol: ['', Validators.required],
    certificadoPkcs12Base64: ['', Validators.required],
    claveCertificado: ['', Validators.required]
  });

  habilitado(): boolean {
    const perfil = this.perfil();
    return !!perfil?.credencialesConfiguradas && !!perfil.serieBoleta && !!perfil.serieFactura;
  }

  ngOnInit() {
    this.facturacionService.obtenerConfiguracion().subscribe({
      next: perfil => {
        this.aplicarPerfil(perfil);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status !== 404) {
          this.loadError.set('No se pudieron consultar los datos fiscales actuales.');
        }
        this.cargando.set(false);
      }
    });
  }

  cambiaSerie(): boolean {
    const perfil = this.perfil();
    if (!perfil) return false;
    const { serieBoleta, serieFactura } = this.seriesForm.getRawValue();
    return (!!perfil.serieBoleta && serieBoleta.trim().toUpperCase() !== perfil.serieBoleta)
      || serieFactura.trim().toUpperCase() !== perfil.serieFactura;
  }

  /** Guarda las series conservando los datos de la empresa registrados en Farmacia. */
  guardarSeries() {
    const perfil = this.perfil();
    if (!perfil || this.seriesForm.invalid) {
      this.seriesForm.markAllAsTouched();
      return;
    }
    this.guardandoPerfil.set(true);
    const v = this.seriesForm.getRawValue();
    this.facturacionService.guardarPerfil({
      ruc: perfil.ruc,
      razonSocial: perfil.razonSocial,
      direccionFiscal: perfil.direccionFiscal,
      ubigeo: perfil.ubigeo,
      departamento: perfil.departamento,
      provincia: perfil.provincia,
      distrito: perfil.distrito,
      telefono: perfil.telefono,
      email: perfil.email,
      serieBoleta: v.serieBoleta.trim().toUpperCase(),
      serieFactura: v.serieFactura.trim().toUpperCase()
    }).subscribe({
      next: actualizado => {
        this.aplicarPerfil(actualizado);
        this.guardandoPerfil.set(false);
        this.snackBar.open('Series guardadas.', 'OK', { duration: 3000 });
      },
      error: () => this.guardandoPerfil.set(false)
    });
  }

  leerCertificado(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    this.errorCertificado.set(null);
    this.nombreCertificado.set(null);
    this.credencialesForm.controls.certificadoPkcs12Base64.setValue('');
    if (!archivo) return;
    if (archivo.size > MAX_CERTIFICADO_BYTES) {
      this.errorCertificado.set('El certificado no puede superar 1 MB.');
      input.value = '';
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      // readAsDataURL entrega "data:<tipo>;base64,<contenido>"; el backend espera solo el contenido.
      const resultado = String(lector.result ?? '');
      this.credencialesForm.controls.certificadoPkcs12Base64.setValue(
        resultado.substring(resultado.indexOf(',') + 1));
      this.nombreCertificado.set(archivo.name);
    };
    lector.onerror = () => this.errorCertificado.set('No se pudo leer el archivo seleccionado.');
    lector.readAsDataURL(archivo);
  }

  guardarCredenciales() {
    if (this.credencialesForm.invalid) {
      this.credencialesForm.markAllAsTouched();
      return;
    }
    this.guardandoCredenciales.set(true);
    const v = this.credencialesForm.getRawValue();
    this.facturacionService.guardarCredenciales({ ...v, usuarioSol: v.usuarioSol.trim() }).subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.limpiarSecretos();
        this.guardandoCredenciales.set(false);
        this.snackBar.open('Credenciales SUNAT guardadas.', 'OK', { duration: 3000 });
      },
      error: () => this.guardandoCredenciales.set(false)
    });
  }

  private aplicarPerfil(perfil: SunatConfiguracion) {
    this.perfil.set(perfil);
    this.seriesForm.patchValue({
      serieBoleta: perfil.serieBoleta ?? SERIE_BOLETA_INICIAL,
      serieFactura: perfil.serieFactura
    });
  }

  /** Los secretos no se conservan en el formulario después de guardarlos. */
  private limpiarSecretos() {
    this.credencialesForm.reset();
    this.nombreCertificado.set(null);
  }
}
