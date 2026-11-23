import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { catchError, forkJoin, of } from 'rxjs';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import { AlertaInventario } from '../../models/inventario.model';

import { ClienteService } from '../../services/cliente.service';
import { ProductoService } from '../../services/producto.service';
import { VentaService } from '../../services/venta.service';
import { PersonalService } from '../../services/personal.service';
import { AuthService } from '../../services/auth.service';
import { StatsCardsComponent } from './widgets/stats-cards/stats-cards.component';
import { Venta } from '../../models/venta.model';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    BaseChartDirective,
    StatsCardsComponent,
    CurrencyPipe,
    DatePipe,
    RouterLink
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <p class="eyebrow">Resumen de la farmacia</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error" role="alert">
          <mat-icon>error_outline</mat-icon>
          <span>{{ loadError() }}</span>
          <button mat-stroked-button type="button" (click)="loadStats()">Reintentar</button>
        </div>
      }

      <app-stats-cards
        [totalClientes]="stats().clientes"
        [totalProductos]="stats().productos"
        [totalVentas]="stats().ventas"
        [totalPersonal]="stats().personal"
        [showPersonal]="hasStaffAccess()" />

      <section class="atencion-grid" aria-label="Atención requerida">
        <mat-card class="atencion-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icono ventas">point_of_sale</mat-icon>
            <mat-card-title>Ventas de hoy</mat-card-title>
            <mat-card-subtitle>Solo ventas confirmadas</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="cifra">{{ ventasHoy().total | currency:'PEN':'S/ ' }}</p>
            <p class="detalle">{{ ventasHoy().cantidad }} {{ ventasHoy().cantidad === 1 ? 'venta' : 'ventas' }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="atencion-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icono stock">inventory</mat-icon>
            <mat-card-title>Stock bajo el mínimo</mat-card-title>
            <mat-card-subtitle>{{ stockBajo().length }} {{ stockBajo().length === 1 ? 'producto' : 'productos' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (!stockBajo().length) {
              <p class="detalle">Todos los productos con mínimo configurado tienen stock suficiente.</p>
            } @else {
              <ul class="lista">
                @for (p of stockBajo().slice(0, 5); track p.id) {
                  <li>
                    <span>{{ p.nombre }}</span>
                    <strong [class.agotado]="p.stock === 0">{{ p.stock }} / mín {{ p.stockMinimo }}</strong>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
          @if (puedeVerInventario) {
            <mat-card-actions>
              <a mat-button routerLink="/catalogo/productos">Ver productos</a>
            </mat-card-actions>
          }
        </mat-card>

        @if (puedeVerInventario) {
          <mat-card class="atencion-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="icono vence">event_busy</mat-icon>
              <mat-card-title>Lotes por vencer</mat-card-title>
              <mat-card-subtitle>Próximos {{ diasVencimiento }} días</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (errorAlertas()) {
                <p class="detalle" role="alert">No se pudieron cargar las alertas de vencimiento.</p>
              } @else if (!alertasVencimiento().length) {
                <p class="detalle">No hay lotes con stock que venzan en este periodo.</p>
              } @else {
                <ul class="lista">
                  @for (a of alertasVencimiento().slice(0, 5); track a.loteId) {
                    <li>
                      <span>{{ a.producto }} · lote {{ a.codigoLote }}</span>
                      <strong [class.agotado]="a.prioridad === 'ALTA'">{{ a.fechaVencimiento | date:'dd/MM/yyyy' }}</strong>
                    </li>
                  }
                </ul>
              }
            </mat-card-content>
            <mat-card-actions>
              <a mat-button routerLink="/inventario">Ver inventario</a>
            </mat-card-actions>
          </mat-card>
        }
      </section>

      <div class="charts-grid">
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Ventas por Mes</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas baseChart
                    [data]="ventasChartData"
                    [options]="barChartOptions"
                    type="bar">
            </canvas>
          </mat-card-content>
        </mat-card>

        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Stock de Productos (Top 10 menor stock)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas baseChart
                    [data]="stockChartData"
                    [options]="stockChartOptions"
                    type="bar">
            </canvas>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .atencion-grid {
      display: grid; gap: 16px; margin: 16px 0;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .icono { display: grid; place-items: center; border-radius: 50%; }
    .icono.ventas { background: #f6e3dd; color: #993522; }
    .icono.stock { background: #fbefd6; color: #8a5a00; }
    .icono.vence { background: #fbe4e1; color: #8c1d12; }
    .cifra { font-size: 1.8rem; font-weight: 600; margin: 8px 0 0; }
    .detalle { color: #62594e; margin: 4px 0 0; }
    .lista { list-style: none; padding: 0; margin: 8px 0 0; }
    .lista li {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 6px 0; border-bottom: 1px solid #eee7df;
    }
    .lista li span { min-width: 0; overflow-wrap: anywhere; }
    .lista strong { white-space: nowrap; }
    .lista strong.agotado { color: #b3261e; }
  `
})
export class DashboardComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private productoService = inject(ProductoService);
  private ventaService = inject(VentaService);
  private personalService = inject(PersonalService);
  private authService = inject(AuthService);
  private inventarioService = inject(InventarioService);

  stats = signal({ clientes: 0, productos: 0, ventas: 0, personal: 0 });
  loadError = signal<string | null>(null);
  hasStaffAccess = signal(['ADMINISTRADOR', 'QF_REGENTE'].includes(this.authService.userRole()));
  readonly puedeVerInventario = this.authService.hasPermission('INVENTARIO:VER');
  readonly diasVencimiento = 30;
  ventasHoy = signal({ total: 0, cantidad: 0 });
  stockBajo = signal<Producto[]>([]);
  alertasVencimiento = signal<AlertaInventario[]>([]);
  errorAlertas = signal(false);

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  stockChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { beginAtZero: true }
    }
  };

  ventasChartData: ChartData<'bar'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      label: 'Ventas (S/)',
      backgroundColor: 'rgba(185, 76, 55, 0.68)',
      borderColor: 'rgba(153, 53, 34, 1)',
      borderWidth: 1
    }]
  };

  stockChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Stock',
      backgroundColor: 'rgba(189, 133, 36, 0.65)',
      borderColor: 'rgba(150, 101, 0, 1)',
      borderWidth: 1
    }]
  };

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loadError.set(null);
    forkJoin({
      clientes: this.clienteService.listar(),
      productos: this.productoService.listar(),
      ventas: this.ventaService.listar(),
      personal: this.hasStaffAccess() ? this.personalService.listar() : of([]),
      // Las alertas son complementarias: si fallan, el resto del resumen se muestra igual.
      alertas: this.puedeVerInventario
        ? this.inventarioService.listarAlertas(this.diasVencimiento).pipe(
            catchError(() => {
              this.errorAlertas.set(true);
              return of([] as AlertaInventario[]);
            }))
        : of([] as AlertaInventario[])
    }).subscribe({
      next: (data) => {
        this.stats.set({
          clientes: data.clientes.length,
          productos: data.productos.length,
          ventas: data.ventas.length,
          personal: data.personal.length
        });
        this.updateCharts(data.ventas, data.productos);
        this.ventasHoy.set(this.resumirVentasDeHoy(data.ventas));
        this.stockBajo.set(this.productosBajoMinimo(data.productos));
        this.alertasVencimiento.set(data.alertas
          .filter(a => a.tipo === 'VENCIMIENTO')
          .sort((a, b) => (a.fechaVencimiento ?? '').localeCompare(b.fechaVencimiento ?? '')));
      },
      error: (error: unknown) => {
        console.error('No se pudo cargar el resumen de la farmacia.', error);
        this.loadError.set('No se pudieron cargar los datos. Verifica tu conexión e inténtalo de nuevo.');
      }
    });
  }

  private updateCharts(ventas: Venta[], productos: Producto[]) {
    this.ventasChartData = {
      ...this.ventasChartData,
      datasets: [{
        ...this.ventasChartData.datasets[0],
        data: this.agruparVentasPorMes(ventas)
      }]
    };

    const topProductos = [...productos]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    this.stockChartData = {
      labels: topProductos.map(p => p.nombre.substring(0, 20)),
      datasets: [{
        ...this.stockChartData.datasets[0],
        data: topProductos.map(p => p.stock)
      }]
    };
  }

  private resumirVentasDeHoy(ventas: Venta[]): { total: number; cantidad: number } {
    const hoy = new Date().toDateString();
    const deHoy = ventas.filter(v =>
      v.estado === 'CONFIRMADA' && new Date(v.fecha).toDateString() === hoy);
    return {
      total: deHoy.reduce((suma, v) => suma + Number(v.total ?? 0), 0),
      cantidad: deHoy.length
    };
  }

  /** Solo cuentan productos con un mínimo configurado (0 desactiva la alerta). */
  private productosBajoMinimo(productos: Producto[]): Producto[] {
    return productos
      .filter(p => (p.stockMinimo ?? 0) > 0 && p.stock < p.stockMinimo!)
      .sort((a, b) => a.stock / a.stockMinimo! - b.stock / b.stockMinimo!);
  }

  private agruparVentasPorMes(ventas: Venta[]): number[] {
    const meses = new Array(12).fill(0);
    const anioActual = new Date().getFullYear();
    ventas.forEach(v => {
      const fecha = new Date(v.fecha);
      if (fecha.getFullYear() === anioActual) {
        meses[fecha.getMonth()] += v.total;
      }
    });
    return meses;
  }
}
