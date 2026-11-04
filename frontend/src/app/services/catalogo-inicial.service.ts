import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CatalogoInicialEstado {
  disponible: boolean;
  productosExistentes: number;
}

export interface CatalogoInicialResultado {
  productos: number;
  lotes: number;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoInicialService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/administracion/catalogo-inicial`;

  estado(): Observable<CatalogoInicialEstado> {
    return this.http.get<CatalogoInicialEstado>(`${this.apiUrl}/estado`);
  }

  importar(archivo: File): Observable<CatalogoInicialResultado> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<CatalogoInicialResultado>(this.apiUrl, formData);
  }
}
