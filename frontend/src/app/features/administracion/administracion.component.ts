import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  CatalogoInicialEstado,
  CatalogoInicialService
} from '../../services/catalogo-inicial.service';

interface AdminLink {
  title: string;
  description: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Configuración y operación</p>
          <h1>Administración de la farmacia</h1>
        </div>
      </div>

      <p class="intro">
        Configura el catálogo por lotes, la botica y los perfiles del equipo. Las operaciones de
        ventas, clientes e inventario permanecen en sus módulos de trabajo.
      </p>

      <section class="setup-grid" aria-label="Configuración inicial">
        <mat-card class="setup-card" [class.complete]="catalogoEstado()?.productosExistentes">
          <mat-card-header>
            <div mat-card-avatar class="step-number">1</div>
            <mat-card-title>Catálogo inicial</mat-card-title>
            <mat-card-subtitle>Importa productos y lotes con vencimiento.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (loading()) {
              <mat-spinner diameter="24"></mat-spinner>
            } @else if (catalogoEstado()?.disponible) {
              <p>Disponible solo mientras la farmacia no tenga productos.</p>
              <p class="file-note">CSV o XLSX · Máximo 5 MB y 500 filas · Una fila por lote</p>
              <input #fileInput class="file-input" type="file" accept=".csv,.xlsx"
                     (change)="seleccionarArchivo($event)">
              @if (archivo()) {
                <p class="selected-file"><mat-icon>description</mat-icon>{{ archivo()?.name }}</p>
              }
              <div class="button-row">
                <button mat-stroked-button type="button" (click)="fileInput.click()">
                  Elegir archivo
                </button>
                <button mat-raised-button color="primary" type="button"
                        [disabled]="!archivo() || importing()" (click)="importar()">
                  @if (importing()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Importar catálogo
                  }
                </button>
              </div>
              <button mat-button type="button" (click)="descargarPlantilla()">
                <mat-icon>download</mat-icon> Descargar plantilla CSV
              </button>
            } @else {
              <p class="complete-note">
                El catálogo ya está iniciado ({{ catalogoEstado()?.productosExistentes ?? 0 }} productos).
                Continúa gestionándolo desde Productos e Inventario.
              </p>
              <a mat-button routerLink="/catalogo/productos">Abrir catálogo</a>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="setup-card">
          <mat-card-header>
            <div mat-card-avatar class="step-number">2</div>
            <mat-card-title>Datos de la Botica</mat-card-title>
            <mat-card-subtitle>Consulta y actualiza la información autorizada.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>El Administrador define si el Gerente/Supervisor puede modificar el nombre de la farmacia.</p>
            <a mat-raised-button color="primary" routerLink="/farmacia">Administrar Botica</a>
          </mat-card-content>
        </mat-card>

        <mat-card class="setup-card">
          <mat-card-header>
            <div mat-card-avatar class="step-number">3</div>
            <mat-card-title>Usuarios y personal</mat-card-title>
            <mat-card-subtitle>Asigna perfiles y delegaciones con alcance limitado.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Empleado/Cajero, Q.F. regente y Gerente/Supervisor tienen accesos distintos.</p>
            <a mat-raised-button color="primary" routerLink="/usuarios">Gestionar usuarios</a>
            <a mat-button routerLink="/personal">Gestionar personal</a>
          </mat-card-content>
        </mat-card>
      </section>

      @if (error()) {
        <p class="error-message" role="alert">{{ error() }}</p>
      }
      @if (mensaje()) {
        <p class="success-message" role="status">{{ mensaje() }}</p>
      }

      <section class="role-guide">
        <h2>Perfiles de acceso</h2>
        <div class="role-grid">
          <p><strong>Administrador:</strong> acceso completo y control de delegaciones.</p>
          <p><strong>Gerente/Supervisor:</strong> operación y personal; Botica y usuarios según delegación.</p>
          <p><strong>Q.F. regente:</strong> operación y personal; sin acceso al módulo Usuarios ni edición de Botica.</p>
          <p><strong>Empleado/Cajero:</strong> operación de clientes, catálogo, inventario y ventas; sin Usuarios ni Personal.</p>
        </div>
      </section>

      <section class="use-cases">
        <h2>Casos de uso de KipuSalud</h2>
        <div class="link-grid">
          @for (link of links; track link.route) {
            <a class="use-case-link" [routerLink]="link.route">
              <mat-icon>{{ link.icon }}</mat-icon>
              <span><strong>{{ link.title }}</strong><small>{{ link.description }}</small></span>
              <mat-icon class="arrow">arrow_forward</mat-icon>
            </a>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .intro { max-width: 820px; margin: -10px 0 24px; color: var(--kipu-muted); line-height: 1.7; }
    .setup-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .setup-card { min-height: 250px; }
    mat-card-header { padding: 18px 18px 0; }
    mat-card-content { display: grid; align-content: start; gap: 8px; padding: 14px 18px 20px; }
    mat-card-content p { margin: 0; color: var(--kipu-muted); line-height: 1.55; }
    .step-number { display: grid; place-items: center; border-radius: 50%; background: #c2edce; color: #294e38; font-weight: 700; }
    .file-input { display: none; }
    .file-note, .selected-file { font-size: 12px; }
    .selected-file { display: flex; align-items: center; gap: 6px; overflow-wrap: anywhere; }
    .button-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .complete-note { color: #41664f !important; }
    .role-guide, .use-cases { margin-top: 30px; }
    h2 { font: 500 22px Georgia, "Times New Roman", serif; }
    .role-grid, .link-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .role-grid p { margin: 0; padding: 14px; background: #f9f3e6; border: 1px solid #e8e2d6; border-radius: 10px; line-height: 1.55; }
    .use-case-link { display: flex; align-items: center; gap: 12px; padding: 14px; color: inherit; text-decoration: none; background: #fffdf8; border: 1px solid #e8e2d6; border-radius: 10px; transition: background .2s, border-color .2s, transform .2s; }
    .use-case-link:hover { background: #f9f3e6; border-color: #dec0ba; transform: translateY(-1px); }
    .use-case-link > mat-icon:first-child { color: #41664f; }
    .use-case-link span { display: grid; gap: 3px; flex: 1; }
    .use-case-link small { color: var(--kipu-muted); line-height: 1.4; }
    .arrow { color: var(--kipu-muted); }
    .error-message, .success-message { margin-top: 16px; padding: 12px 16px; border-radius: 8px; }
    .error-message { color: #832514; background: #ffdad6; }
    .success-message { color: #294e38; background: #c2edce; }
    @media (max-width: 950px) { .setup-grid { grid-template-columns: 1fr; } }
    @media (max-width: 650px) { .role-grid, .link-grid { grid-template-columns: 1fr; } }
  `
})
export class AdministracionComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoInicialService);

  catalogoEstado = signal<CatalogoInicialEstado | null>(null);
  loading = signal(true);
  importing = signal(false);
  archivo = signal<File | null>(null);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  readonly links: AdminLink[] = [
    { title: 'Dashboard', description: 'Indicadores principales de la farmacia.', route: '/dashboard', icon: 'dashboard' },
    { title: 'Clientes y pacientes', description: 'Registro y consulta de clientes.', route: '/clientes', icon: 'people' },
    { title: 'Categorías', description: 'Organización del catálogo.', route: '/catalogo/categorias', icon: 'category' },
    { title: 'Productos', description: 'Precios, datos y productos disponibles.', route: '/catalogo/productos', icon: 'inventory_2' },
    { title: 'Inventario y vencimientos', description: 'Lotes, Kardex y alertas FEFO.', route: '/inventario', icon: 'receipt_long' },
    { title: 'Punto de venta', description: 'Registrar una venta y el medio de pago.', route: '/ventas/nueva', icon: 'point_of_sale' },
    { title: 'Historial y comprobantes', description: 'Consultar ventas y comprobantes emitidos.', route: '/ventas', icon: 'history' },
    { title: 'Personal', description: 'Administrar la ficha del equipo.', route: '/personal', icon: 'badge' },
    { title: 'Usuarios', description: 'Cuentas, roles y delegaciones.', route: '/usuarios', icon: 'manage_accounts' }
  ];

  ngOnInit() {
    this.cargarEstado();
  }

  seleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error.set(null);
    this.mensaje.set(null);
    if (file && file.size > 5 * 1024 * 1024) {
      this.archivo.set(null);
      this.error.set('El archivo supera el límite de 5 MB.');
      input.value = '';
      return;
    }
    if (file && !/\.(csv|xlsx)$/i.test(file.name)) {
      this.archivo.set(null);
      this.error.set('Selecciona un archivo CSV o XLSX.');
      input.value = '';
      return;
    }
    this.archivo.set(file);
  }

  importar() {
    const file = this.archivo();
    if (!file || this.importing()) return;
    this.importing.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    this.catalogoService.importar(file).subscribe({
      next: result => {
        this.importing.set(false);
        this.archivo.set(null);
        this.mensaje.set(`${result.mensaje}: ${result.productos} productos y ${result.lotes} lotes.`);
        this.cargarEstado();
      },
      error: err => {
        console.error('No se pudo importar el catálogo inicial.', err);
        this.importing.set(false);
        this.error.set(err.error?.detail ?? err.error?.message
          ?? 'No se importó ningún dato. Revisa las filas indicadas y vuelve a intentarlo.');
      }
    });
  }

  descargarPlantilla() {
    const csv = [
      'nombre,descripcion,categoria,precio,stockMinimo,codigoLote,fechaVencimiento,cantidad',
      'Paracetamol 500 mg,Analgésico de uso general,Analgésicos,8.50,10,LOTE-2026-001,2027-12-31,100'
    ].join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-catalogo-inicial.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private cargarEstado() {
    this.loading.set(true);
    this.catalogoService.estado().subscribe({
      next: estado => {
        this.catalogoEstado.set(estado);
        this.loading.set(false);
      },
      error: err => {
        console.error('No se pudo consultar el estado del catálogo inicial.', err);
        this.loading.set(false);
        this.error.set('No se pudo consultar el estado del catálogo inicial.');
      }
    });
  }
}
