import { Component, input, output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: readonly string[];
  permission?: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
  ],
  template: `
    <div class="sidenav-header">
      <mat-icon class="logo">local_pharmacy</mat-icon>
      @if (expanded()) {
        <div class="brand-copy">
          <span class="brand-name">KipuSalud</span>
          <span class="pharmacy-name">{{ authService.usuario()?.farmaciaNombre }}</span>
        </div>
      }
    </div>

    <mat-nav-list>
      @for (item of navItems; track item.route) {
        @if ((!item.roles || item.roles.includes(authService.userRole()))
          && (!item.permission || authService.hasPermission(item.permission))) {
          <a mat-list-item
             [routerLink]="item.route"
             routerLinkActive="active"
             [matTooltip]="!expanded() ? item.label : ''"
             matTooltipPosition="right">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            @if (expanded()) {
              <span matListItemTitle>{{ item.label }}</span>
            }
          </a>
        }
      }
    </mat-nav-list>

    <div class="sidenav-footer">
      <button mat-icon-button (click)="toggleExpand.emit()">
        <mat-icon>{{ expanded() ? 'chevron_left' : 'chevron_right' }}</mat-icon>
      </button>
    </div>
  `,
  styles: ``
})
export class SidenavComponent {
  expanded = input(true);
  toggleExpand = output<void>();

  authService = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', permission: 'DASHBOARD:VER' },
    { label: 'Clientes', icon: 'people', route: '/clientes', permission: 'CLIENTES:VER' },
    { label: 'Categorías', icon: 'category', route: '/catalogo/categorias', permission: 'CATALOGO:VER' },
    { label: 'Productos y stock', icon: 'inventory_2', route: '/catalogo/productos', permission: 'CATALOGO:VER' },
    { label: 'Ingresos y Kardex', icon: 'receipt_long', route: '/inventario', permission: 'INVENTARIO:VER' },
    { label: 'Ventas y despacho', icon: 'point_of_sale', route: '/ventas', permission: 'VENTAS:VER' },
    { label: 'Personal', icon: 'badge', route: '/personal', permission: 'PERSONAL:VER' },
    { label: 'Usuarios', icon: 'manage_accounts', route: '/usuarios', permission: 'USUARIOS:VER' },
    { label: 'Farmacia', icon: 'local_pharmacy', route: '/farmacia', permission: 'FARMACIA:VER' },
    { label: 'Administración', icon: 'admin_panel_settings', route: '/administracion', roles: ['ADMINISTRADOR'] }
  ];
}
