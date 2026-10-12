import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, RegistroRequest, Usuario } from '../models/auth.model';

export interface UsuarioFarmacia {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
}

export interface CrearUsuarioFarmacia {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  private usuarioSignal = signal<Usuario | null>(this.getStoredUser());

  usuario = this.usuarioSignal.asReadonly();
  isAuthenticated = computed(() => !!this.usuarioSignal());
  userRole = computed(() => this.usuarioSignal()?.rol ?? '');

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          const usuario: Usuario = {
            username: response.username,
            rol: response.rol,
            token: response.token,
            farmaciaId: response.farmaciaId,
            farmaciaNombre: response.farmaciaNombre
          };
          this.storeUser(usuario);
        })
      );
  }

  registro(data: RegistroRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, data)
      .pipe(tap(response => this.storeUser({
        username: response.username,
        rol: response.rol,
        token: response.token,
        farmaciaId: response.farmaciaId,
        farmaciaNombre: response.farmaciaNombre
      })));
  }

  listarUsuarios(): Observable<UsuarioFarmacia[]> {
    return this.http.get<UsuarioFarmacia[]>(`${this.apiUrl}/usuarios`);
  }

  crearUsuario(data: CrearUsuarioFarmacia): Observable<UsuarioFarmacia> {
    return this.http.post<UsuarioFarmacia>(`${this.apiUrl}/usuarios`, data);
  }

  logout(): void {
    localStorage.removeItem('usuario');
    this.usuarioSignal.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return this.usuarioSignal()?.token ?? null;
  }

  private getStoredUser(): Usuario | null {
    const stored = localStorage.getItem('usuario');
    if (!stored) return null;
    try {
      const user = JSON.parse(stored) as Partial<Usuario>;
      if (typeof user.token !== 'string' || typeof user.username !== 'string'
          || typeof user.rol !== 'string' || typeof user.farmaciaId !== 'number'
          || typeof user.farmaciaNombre !== 'string') {
        localStorage.removeItem('usuario');
        return null;
      }
      return user as Usuario;
    } catch {
      localStorage.removeItem('usuario');
      return null;
    }
  }

  private storeUser(usuario: Usuario): void {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    this.usuarioSignal.set(usuario);
  }
}
