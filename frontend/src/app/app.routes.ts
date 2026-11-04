import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component')
      .then(m => m.LandingComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes')
          .then(m => m.DASHBOARD_ROUTES),
        canActivate: [permissionGuard],
        data: { permission: 'DASHBOARD:VER' }
      },
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/clientes.routes')
          .then(m => m.CLIENTES_ROUTES),
        canActivate: [permissionGuard],
        data: { permission: 'CLIENTES:VER' }
      },
      {
        path: 'catalogo',
        loadChildren: () => import('./features/catalogo/catalogo.routes')
          .then(m => m.CATALOGO_ROUTES),
        canActivate: [permissionGuard],
        data: { permission: 'CATALOGO:VER' }
      },
      {
        path: 'ventas',
        loadChildren: () => import('./features/ventas/ventas.routes')
          .then(m => m.VENTAS_ROUTES),
        canActivate: [permissionGuard],
        data: { permission: 'VENTAS:VER' }
      },
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/inventario.component')
          .then(m => m.InventarioComponent),
        canActivate: [permissionGuard],
        data: { permission: 'INVENTARIO:VER' }
      },
      {
        path: 'personal',
        loadChildren: () => import('./features/personal/personal.routes')
          .then(m => m.PERSONAL_ROUTES),
        canActivate: [permissionGuard],
        data: { permission: 'PERSONAL:VER' }
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios.component')
          .then(m => m.UsuariosComponent),
        canActivate: [permissionGuard],
        data: { permission: 'USUARIOS:VER' }
      },
      {
        path: 'farmacia',
        loadComponent: () => import('./features/farmacia/farmacia.component')
          .then(m => m.FarmaciaComponent),
        canActivate: [permissionGuard],
        data: { permission: 'FARMACIA:VER' }
      },
      {
        path: 'administracion',
        loadComponent: () => import('./features/administracion/administracion.component')
          .then(m => m.AdministracionComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
