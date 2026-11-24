import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KardexValorizado, ReporteMermas, ReporteVentasTurno } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  kardex(productoId: number, desde: string, hasta: string): Observable<KardexValorizado> {
    return this.http.get<KardexValorizado>(`${this.api}/inventario/reportes/kardex`, {
      params: new HttpParams().set('productoId', productoId).set('desde', desde).set('hasta', hasta)
    });
  }

  mermas(desde: string, hasta: string): Observable<ReporteMermas> {
    return this.http.get<ReporteMermas>(`${this.api}/inventario/reportes/mermas`, {
      params: new HttpParams().set('desde', desde).set('hasta', hasta)
    });
  }

  ventasPorTurno(desde: string, hasta: string): Observable<ReporteVentasTurno> {
    return this.http.get<ReporteVentasTurno>(`${this.api}/ventas/reportes/turnos`, {
      params: new HttpParams().set('desde', desde).set('hasta', hasta)
    });
  }
}
