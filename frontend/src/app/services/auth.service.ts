import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { MENSAJES_POR_ESTADO } from '../core/interceptors/error.interceptor';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemoSessionResponse } from '../models/auth.model';
import { LoginRequest, LoginResponse, RegistroRequest, Usuario } from '../models/auth.model';

export interface UsuarioFarmacia {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
  permisos: string[];
}

export interface CrearUsuarioFarmacia {
  username: string;
  password: string;
  rol: string;
  permisos: string[];
}

export interface ActualizarUsuarioFarmacia {
  rol: string;
  activo: boolean;
  permisos: string[];
}

export interface Farmacia {
  id: number;
  nombre: string;
  codigo: string;
}

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ADMINISTRADOR: [
    'DASHBOARD:VER', 'CLIENTES:VER', 'CLIENTES:GESTIONAR', 'CATALOGO:VER', 'CATALOGO:GESTIONAR',
    'INVENTARIO:VER', 'INVENTARIO:GESTIONAR', 'VENTAS:VER', 'VENTAS:GESTIONAR',
    'PERSONAL:VER', 'PERSONAL:GESTIONAR', 'USUARIOS:VER', 'USUARIOS:GESTIONAR',
    'FARMACIA:VER', 'FARMACIA:EDITAR'
  ],
  GERENTE_SUPERVISOR: [
    'DASHBOARD:VER', 'CLIENTES:VER', 'CLIENTES:GESTIONAR', 'CATALOGO:VER', 'CATALOGO:GESTIONAR',
    'INVENTARIO:VER', 'INVENTARIO:GESTIONAR', 'VENTAS:VER', 'VENTAS:GESTIONAR',
    'PERSONAL:VER', 'PERSONAL:GESTIONAR', 'FARMACIA:VER'
  ],
  QF_REGENTE: [
    'DASHBOARD:VER', 'CLIENTES:VER', 'CLIENTES:GESTIONAR', 'CATALOGO:VER', 'CATALOGO:GESTIONAR',
    'INVENTARIO:VER', 'INVENTARIO:GESTIONAR', 'VENTAS:VER', 'VENTAS:GESTIONAR',
    'PERSONAL:VER', 'PERSONAL:GESTIONAR', 'FARMACIA:VER'
  ],
  EMPLEADO: [
    'DASHBOARD:VER', 'CLIENTES:VER', 'CLIENTES:GESTIONAR', 'CATALOGO:VER', 'CATALOGO:GESTIONAR',
    'INVENTARIO:VER', 'INVENTARIO:GESTIONAR', 'VENTAS:VER', 'VENTAS:GESTIONAR', 'FARMACIA:VER'
  ]
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  private usuarioSignal = signal<Usuario | null>(this.getStoredUser());

  usuario = this.usuarioSignal.asReadonly();
  isAuthenticated = computed(() => !!this.usuarioSignal());
  userRole = computed(() => this.usuarioSignal()?.rol ?? '');

  hasPermission(permission: string): boolean {
    const user = this.usuarioSignal();
    if (!user) return false;
    return user.permisos?.includes(permission)
      ?? ROLE_PERMISSIONS[user.rol]?.includes(permission)
      ?? false;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          const usuario: Usuario = {
            username: response.username,
            rol: response.rol,
            token: response.token,
            farmaciaId: response.farmaciaId,
            farmaciaNombre: response.farmaciaNombre,
            farmaciaCodigo: response.farmaciaCodigo,
            permisos: response.permisos
          };
          this.storeUser(usuario);
        })
      );
  }

  crearSesionDemo(): Observable<DemoSessionResponse> {
    return this.http.post<DemoSessionResponse>(`${this.apiUrl}/demo/sessions`, {});
  }

  registro(data: RegistroRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, data)
      .pipe(tap(response => this.storeUser({
        username: response.username,
        rol: response.rol,
        token: response.token,
        farmaciaId: response.farmaciaId,
        farmaciaNombre: response.farmaciaNombre,
        farmaciaCodigo: response.farmaciaCodigo,
        permisos: response.permisos
      })));
  }

  listarUsuarios(): Observable<UsuarioFarmacia[]> {
    return this.http.get<UsuarioFarmacia[]>(`${this.apiUrl}/usuarios`);
  }

  crearUsuario(data: CrearUsuarioFarmacia): Observable<UsuarioFarmacia> {
    return this.http.post<UsuarioFarmacia>(`${this.apiUrl}/usuarios`, data);
  }

  actualizarUsuario(id: number, data: ActualizarUsuarioFarmacia): Observable<UsuarioFarmacia> {
    return this.http.put<UsuarioFarmacia>(`${this.apiUrl}/usuarios/${id}`, data);
  }

  cambiarPassword(passwordActual: string, nuevaPassword: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mi-password`, { passwordActual, nuevaPassword }, {
      context: new HttpContext().set(MENSAJES_POR_ESTADO, {
        400: 'La contraseña actual no es correcta o la nueva no cumple los requisitos.'
      })
    });
  }

  obtenerFarmacia(): Observable<Farmacia> {
    return this.http.get<Farmacia>(`${this.apiUrl}/farmacia`);
  }

  actualizarFarmacia(nombre: string): Observable<Farmacia> {
    return this.http.put<Farmacia>(`${this.apiUrl}/farmacia`, { nombre }).pipe(
      tap(farmacia => {
        const current = this.usuarioSignal();
        if (current) this.storeUser({
          ...current,
          farmaciaNombre: farmacia.nombre,
          farmaciaCodigo: farmacia.codigo
        });
      })
    );
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
      if (user.permisos !== undefined && !Array.isArray(user.permisos)) {
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
