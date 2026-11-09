import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent demo credentials', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('fills the selected role credentials without submitting the login form', () => {
    const login = vi.fn();
    const authService = {
      login,
      crearSesionDemo: vi.fn().mockReturnValue(of({
        farmaciaNombre: 'Farmacia Demo',
        farmaciaCodigo: 'KIPU-DEMO',
        expiraEn: '2026-11-09T23:00:00Z',
        credenciales: {
          ADMINISTRADOR: {
            username: 'demo_admin',
            password: 'random-demo-password',
            rol: 'ADMINISTRADOR',
            etiqueta: 'Administrador'
          }
        }
      }))
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([])
      ]
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.crearSesionDemo();

    expect(component.demoSession()?.farmaciaCodigo).toBe('KIPU-DEMO');
    component.rellenarCredenciales(component.credentials()[0]);

    expect(component.loginForm.getRawValue()).toEqual({
      farmaciaCodigo: 'KIPU-DEMO',
      username: 'demo_admin',
      password: 'random-demo-password'
    });
    expect(login).not.toHaveBeenCalled();

    fixture.destroy();
  });
});
