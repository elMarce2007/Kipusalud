import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { forkJoin, of } from 'rxjs';

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
    StatsCardsComponent
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
  styles: ``
})
export class DashboardComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private productoService = inject(ProductoService);
  private ventaService = inject(VentaService);
  private personalService = inject(PersonalService);
  private authService = inject(AuthService);

  stats = signal({ clientes: 0, productos: 0, ventas: 0, personal: 0 });
  loadError = signal<string | null>(null);
  hasStaffAccess = signal(['ADMINISTRADOR', 'QF_REGENTE'].includes(this.authService.userRole()));

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
      personal: this.hasStaffAccess() ? this.personalService.listar() : of([])
    }).subscribe({
      next: (data) => {
        this.stats.set({
          clientes: data.clientes.length,
          productos: data.productos.length,
          ventas: data.ventas.length,
          personal: data.personal.length
        });
        this.updateCharts(data.ventas, data.productos);
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
