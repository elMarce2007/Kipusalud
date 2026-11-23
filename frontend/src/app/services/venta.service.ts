import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Venta, VentaCreate } from '../models/venta.model';
import { MENSAJES_POR_ESTADO } from '../core/interceptors/error.interceptor';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ventas`;

  listar(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.apiUrl);
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }

  crear(venta: VentaCreate): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, venta, {
      context: new HttpContext().set(MENSAJES_POR_ESTADO, {
        400: 'Revisa la venta: el comprobante elegido requiere datos del cliente (RUC para factura, '
          + 'DNI para boletas electrónicas desde S/ 700) o el pago no cubre el total.',
        409: 'Stock insuficiente. Actualiza la lista de productos e inténtalo de nuevo.',
        412: 'La farmacia no tiene habilitado ese comprobante electrónico. Elige otro comprobante.'
      })
    });
  }

  reintentar(id: number): Observable<Venta> {
    return this.http.post<Venta>(`${this.apiUrl}/${id}/reintentar`, {});
  }
}
