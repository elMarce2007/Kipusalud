import { Component, computed, input, output, inject } from '@angular/core';
import { etiquetaRol } from '../../core/utils/roles';
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

      <div class="toolbar-brand">
        <span class="brand-word">KipuSalud</span>
        <span class="brand-slogan">— “Un saber que nos conecta”</span>
      </div>

      <span class="toolbar-pharmacy" title="Farmacia actual">
        <mat-icon>storefront</mat-icon>
        <span>{{ authService.usuario()?.farmaciaNombre || 'KipuSalud' }}</span>
      </span>

      <span class="spacer"></span>

      <button mat-button class="toolbar-user" [matMenuTriggerFor]="userMenu">
        <span class="toolbar-user-copy">
          <strong>{{ authService.usuario()?.username }}</strong>
          <small>{{ rol() }}</small>
        </span>
        <span class="user-avatar" aria-hidden="true"><mat-icon>person</mat-icon></span>
        <mat-icon>expand_more</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu">
        <div class="user-info" mat-menu-item disabled>
          <strong>{{ authService.usuario()?.username }}</strong>
          <small>{{ rol() }}</small>
        </div>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="authService.logout()">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: `
    .toolbar-brand { display: flex; align-items: baseline; gap: 8px; margin-left: 8px; min-width: 0; }
    .brand-word { font: 600 20px "Space Grotesk", sans-serif; color: var(--kipu-ink); }
    .brand-slogan { color: var(--kipu-soft); font: italic 13px "Inter", sans-serif; white-space: nowrap; }
    .toolbar-pharmacy {
      display: inline-flex; align-items: center; gap: 6px; max-width: 260px; margin-left: 18px;
      padding: 4px 10px; border-radius: var(--kipu-radius-sm); background: var(--kipu-surface-high);
      color: var(--kipu-ink); font: 600 13px "Inter", sans-serif;
    }
    .toolbar-pharmacy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .toolbar-pharmacy mat-icon { width: 18px; height: 18px; font-size: 18px; color: var(--kipu-primary); }
    .toolbar-user-copy { align-items: flex-end !important; }
    .user-avatar { width: 36px !important; height: 36px !important; border-radius: 8px !important; background: var(--kipu-primary-container) !important; color: #fff !important; }
    .user-avatar mat-icon { width: 20px; height: 20px; font-size: 20px; }
    @media (max-width: 900px) { .brand-slogan { display: none; } }
    @media (max-width: 600px) { .toolbar-brand, .toolbar-user-copy { display: none !important; } .toolbar-pharmacy { margin-left: 4px; } }
  `
})
export class ToolbarComponent {
  sidenavOpened = input(true);
  toggleSidenav = output<void>();

  authService = inject(AuthService);
  rol = computed(() => etiquetaRol(this.authService.usuario()?.rol));
}
