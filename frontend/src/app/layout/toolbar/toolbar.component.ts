import { Component, input, output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar class="toolbar">
      <button mat-icon-button (click)="toggleSidenav.emit()">
        <mat-icon>{{ sidenavOpened() ? 'menu_open' : 'menu' }}</mat-icon>
      </button>

      <div class="toolbar-context">
        <span class="toolbar-label">Espacio de trabajo</span>
        <strong>{{ authService.usuario()?.farmaciaNombre || 'KipuSalud' }}</strong>
      </div>

      <span class="spacer"></span>

      <button mat-button class="toolbar-user" [matMenuTriggerFor]="userMenu">
        <span class="user-avatar" aria-hidden="true">{{ authService.usuario()?.username?.charAt(0)?.toUpperCase() }}</span>
        <span class="toolbar-user-copy">
          <strong>{{ authService.usuario()?.username }}</strong>
          <small>{{ authService.usuario()?.rol }}</small>
        </span>
        <mat-icon>expand_more</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu">
        <div class="user-info" mat-menu-item disabled>
          <strong>{{ authService.usuario()?.username }}</strong>
          <small>{{ authService.usuario()?.rol }}</small>
        </div>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="authService.logout()">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: ``
})
export class ToolbarComponent {
  sidenavOpened = input(true);
  toggleSidenav = output<void>();

  authService = inject(AuthService);
}
