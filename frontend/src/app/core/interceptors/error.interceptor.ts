import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = `No se pudo completar la solicitud (HTTP ${error.status || 'sin conexión'}).`;

      if (error.status === 401) {
        if (authService.isAuthenticated()) {
          errorMessage = 'Sesión expirada. Inicia sesión nuevamente.';
          authService.logout();
        } else if (req.url.endsWith('/auth/login')) {
          errorMessage = 'Usuario o contraseña incorrectos.';
        } else {
          errorMessage = 'No fue posible validar la sesión.';
        }
      } else if (error.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'No se encontró el recurso solicitado.';
      } else if (error.status === 503) {
        errorMessage = 'Servicio temporalmente no disponible. Inténtelo de nuevo en unos segundos.';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor.';
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar con el servidor.';
      } else {
        const serverMessage = typeof error.error === 'string'
          ? error.error
          : error.error?.detail ?? error.error?.message ?? error.error?.error;
        if (typeof serverMessage === 'string' && serverMessage.trim()) {
          errorMessage = serverMessage;
        }
      }

      snackBar.open(errorMessage, 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      return throwError(() => error);
    })
  );
};
