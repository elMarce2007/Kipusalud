import { Routes } from '@angular/router';

export const PERSONAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./personal-list/personal-list.component')
      .then(m => m.PersonalListComponent)
  },
  {
    path: 'turnos',
    loadComponent: () => import('./turnos/turnos.component').then(m => m.TurnosComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./personal-form/personal-form.component')
      .then(m => m.PersonalFormComponent)
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./personal-form/personal-form.component')
      .then(m => m.PersonalFormComponent)
  }
];
