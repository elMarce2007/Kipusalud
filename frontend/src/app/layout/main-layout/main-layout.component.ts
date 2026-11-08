import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    SidenavComponent,
    ToolbarComponent
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav
        #sidenav
        [mode]="sidenavMode()"
        [opened]="sidenavOpened()"
        class="sidenav"
        [class.collapsed]="!sidenavExpanded()">
        <app-sidenav
          [expanded]="sidenavExpanded()"
          (toggleExpand)="toggleSidenavExpand()" />
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <app-toolbar
          (toggleSidenav)="toggleSidenav()"
          [sidenavOpened]="sidenavOpened()" />
        <main class="main-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: ``
})
export class MainLayoutComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 760px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );
  readonly sidenavMode = computed(() => this.isMobile() ? 'over' : 'side');
  sidenavOpened = signal(true);
  sidenavExpanded = signal(true);

  constructor() {
    effect(() => {
      if (this.isMobile()) {
        this.sidenavOpened.set(false);
        this.sidenavExpanded.set(true);
      } else {
        this.sidenavOpened.set(true);
      }
    });
  }

  toggleSidenav() {
    this.sidenavOpened.update(v => !v);
  }

  toggleSidenavExpand() {
    this.sidenavExpanded.update(v => !v);
  }
}
