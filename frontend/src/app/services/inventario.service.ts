import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AlertaInventario,
  IngresoInventarioRequest,
  IngresoInventarioResult,
  LoteInventario,
  MovimientoInventario
} from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/inventario';

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
}
