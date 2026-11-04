export interface LoginRequest {
  farmaciaCodigo: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  rol: string;
  farmaciaId: number;
  farmaciaNombre: string;
  farmaciaCodigo: string;
  permisos: string[];
}

export interface RegistroRequest {
  farmaciaNombre: string;
  username: string;
  password: string;
}

export interface Usuario {
  username: string;
  rol: string;
  token: string;
  farmaciaId: number;
  farmaciaNombre: string;
  farmaciaCodigo?: string;
  permisos?: string[];
}
