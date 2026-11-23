import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { MENSAJES_POR_ESTADO, SILENCIAR_404, errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('no muestra aviso global para un 404 esperado', () => {
    let status = 0;
    http.get('/api/ventas/1/factura-electronica', {
      context: new HttpContext().set(SILENCIAR_404, true)
    }).subscribe({ error: e => status = e.status });

    backend.expectOne('/api/ventas/1/factura-electronica')
      .flush('', { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('usa el mensaje propio de la operación según el código HTTP', () => {
    http.post('/api/ventas/1/factura-electronica', {}, {
      context: new HttpContext().set(MENSAJES_POR_ESTADO, { 412: 'Configura SUNAT primero.' })
    }).subscribe({ error: () => undefined });

    backend.expectOne('/api/ventas/1/factura-electronica')
      .flush({ error: 'Precondition Failed' }, { status: 412, statusText: 'Precondition Failed' });

    expect(snackBar.open).toHaveBeenCalledWith('Configura SUNAT primero.', 'Cerrar', expect.anything());
  });

  it('sigue mostrando el aviso para un 404 normal', () => {
    http.get('/api/productos/99').subscribe({ error: () => undefined });

    backend.expectOne('/api/productos/99').flush('', { status: 404, statusText: 'Not Found' });

    expect(snackBar.open).toHaveBeenCalledOnce();
  });
});
