import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    authService = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('sends the selected pharmacy code with login credentials', () => {
    const credentials = {
      farmaciaCodigo: 'KIPU-TEST',
      username: 'admin',
      password: 'a-secure-password'
    };

    authService.login(credentials).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);

    request.flush({
      token: 'test-token',
      username: 'admin',
      rol: 'ADMINISTRADOR',
      farmaciaId: 7,
      farmaciaNombre: 'Farmacia de prueba',
      farmaciaCodigo: credentials.farmaciaCodigo,
      permisos: []
    });

    expect(authService.usuario()?.farmaciaCodigo).toBe(credentials.farmaciaCodigo);
  });
});
