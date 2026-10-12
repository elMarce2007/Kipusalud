import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cliente } from '../models/cliente.model';

export interface InformacionClinica {
  diagnosticos: string;
  tratamientos: string;
  alergias: string;
  medicamentos: string;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clientes`;

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  obtener(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  crear(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente);
  }

  actualizar(id: number, cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, cliente);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  obtenerInformacionClinica(id: number): Observable<InformacionClinica> {
    return this.http.get<InformacionClinica>(`${this.apiUrl}/${id}/informacion-clinica`);
  }

  guardarInformacionClinica(id: number, informacion: InformacionClinica): Observable<InformacionClinica> {
    return this.http.put<InformacionClinica>(`${this.apiUrl}/${id}/informacion-clinica`, informacion);
  }
}
