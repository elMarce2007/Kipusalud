import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MENSAJES_POR_ESTADO, SILENCIAR_404 } from '../core/interceptors/error.interceptor';
import {
  AjusteInventario,
  AjusteInventarioRequest,
  AlertaInventario,
  AsignacionFefo,
  LotesDeVenta,
  ResumenInventario,
  IngresoInventarioRequest,
  IngresoInventarioResult,
  LoteInventario,
  MovimientoInventario
} from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/inventario`;

  listarLotes(productoId: number): Observable<LoteInventario[]> {
    return this.http.get<LoteInventario[]>(
      `${this.apiUrl}/productos/${productoId}/lotes`
    );
  }

  registrarIngreso(request: IngresoInventarioRequest): Observable<IngresoInventarioResult> {
    return this.http.post<IngresoInventarioResult>(`${this.apiUrl}/ingresos`, request);
  }

  listarKardex(productoId: number): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(
      `${this.apiUrl}/productos/${productoId}/kardex`
    );
  }

  listarAlertas(diasVencimiento = 30): Observable<AlertaInventario[]> {
    const params = new HttpParams().set('diasVencimiento', diasVencimiento);
    return this.http.get<AlertaInventario[]>(`${this.apiUrl}/alertas`, { params });
  }

  resumen(diasPorVencer = 60): Observable<ResumenInventario[]> {
    const params = new HttpParams().set('diasPorVencer', diasPorVencer);
    return this.http.get<ResumenInventario[]>(`${this.apiUrl}/resumen`, { params });
  }

  /** Vista previa FEFO para una línea del punto de venta. */
  simularFefo(productoId: number, cantidad: number): Observable<AsignacionFefo> {
    const params = new HttpParams().set('cantidad', cantidad);
    return this.http.get<AsignacionFefo>(`${this.apiUrl}/productos/${productoId}/fefo`, { params });
  }

  /** 404: la venta no tiene salida de inventario (por ejemplo, sigue pendiente). */
  lotesDeVenta(claveIdempotencia: string): Observable<LotesDeVenta> {
    return this.http.get<LotesDeVenta>(
      `${this.apiUrl}/ventas/${encodeURIComponent(claveIdempotencia)}/lotes`,
      { context: new HttpContext().set(SILENCIAR_404, true) });
  }

  registrarAjuste(request: AjusteInventarioRequest): Observable<AjusteInventario> {
    return this.http.post<AjusteInventario>(`${this.apiUrl}/ajustes`, request, {
      context: new HttpContext().set(MENSAJES_POR_ESTADO, {
        400: 'Revisa el ajuste: lote, cantidad positiva y motivo (si eliges «Otro», descríbelo).',
        403: 'Solo el Administrador o el Q.F. regente pueden ajustar el stock.',
        409: 'El ajuste dejaría el lote con stock negativo. Revisa la cantidad.'
      })
    });
  }
}
