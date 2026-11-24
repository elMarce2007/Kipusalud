import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: []
})
export class App {
  constructor() {
    // Los diseños de Stitch usan iconos de contorno (outlined) en toda la interfaz.
    inject(MatIconRegistry).setDefaultFontSetClass('material-icons-outlined');
  }
}
