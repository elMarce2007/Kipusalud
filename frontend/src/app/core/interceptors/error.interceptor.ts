import { HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

/**
 * Marca peticiones donde un 404 es una respuesta esperada (por ejemplo, una venta
 * que aún no tiene factura). El componente lo maneja y no se muestra el aviso global.
 */
export const SILENCIAR_404 = new HttpContextToken<boolean>(() => false);

/**
 * Mensajes propios por código HTTP para una petición concreta. Los servicios no
 * exponen el motivo de sus errores (solo "Precondition Failed", etc.), así que
 * cada operación puede explicar qué significa cada código en su contexto.
 */
export const MENSAJES_POR_ESTADO = new HttpContextToken<Partial<Record<number, string>>>(() => ({}));

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 404 && req.context.get(SILENCIAR_404)) {
        return throwError(() => error);
      }

      let errorMessage = `No se pudo completar la solicitud (HTTP ${error.status || 'sin conexión'}).`;

      const mensajePropio = req.context.get(MENSAJES_POR_ESTADO)[error.status];

      if (mensajePropio) {
        errorMessage = mensajePropio;
      } else if (error.status === 401) {
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
