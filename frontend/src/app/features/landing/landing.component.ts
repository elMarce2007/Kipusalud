import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="landing">
      <header class="site-header">
        <a class="brand" routerLink="/" aria-label="KipuSalud, inicio">
          <span class="brand-mark" aria-hidden="true"><img src="/kipusalud-mark.svg" alt=""></span>
          <span class="brand-copy">
            <strong>KipuSalud</strong>
            <small>Gestión logística farmacéutica</small>
          </span>
        </a>

        <nav class="main-nav" aria-label="Navegación principal">
          <a href="#proposito">Propósito</a>
          <a href="#herramientas">Herramientas</a>
          <a href="#identidad">Identidad</a>
          <a href="#para-farmacias">Para farmacias</a>
        </nav>

        <div class="header-actions">
          <a class="header-login" routerLink="/auth/login">Iniciar sesión</a>
          <a class="header-cta" routerLink="/auth/registro">Ingresar / Probar</a>
        </div>
      </header>

      <main>
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-thread" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="hero-inner">
            <div class="hero-copy">
              <p class="eyebrow"><span></span>Sistema de gestión para boticas independientes</p>
              <h1 id="hero-title">El orden y cuidado de tu botica, <em>enlazados en un solo lugar.</em></h1>
              <p class="hero-description">
                KipuSalud reúne catálogo, existencias por lote, vencimientos, ventas y gestión
                del equipo en una aplicación web clara y fácil de recorrer.
              </p>
              <div class="hero-actions">
                <a class="button button-primary" routerLink="/auth/login">
                  Ingresar a la plataforma <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                </a>
                <a class="button button-secondary" href="#herramientas">
                  <mat-icon aria-hidden="true">play_circle</mat-icon> Ver herramientas
                </a>
              </div>
              <div class="hero-highlights" aria-label="Características">
                <div><strong>Web</strong><span>Acceso desde navegador</span></div>
                <div><strong>Por lote</strong><span>Existencias y vencimientos</span></div>
                <div><strong>Por rol</strong><span>Accesos del equipo</span></div>
              </div>
            </div>

            <div class="quipu-panel">
              <div class="panel-heading">
                <span class="panel-icon"><mat-icon aria-hidden="true">device_hub</mat-icon></span>
                <div><strong>Una gestión conectada</strong><small>Los módulos de tu farmacia, en contexto</small></div>
              </div>
              <div class="quipu-visual">
                <svg class="quipu-diagram" viewBox="0 0 360 300" role="img"
                     aria-labelledby="quipu-title quipu-description">
                  <title id="quipu-title">Diagrama inspirado en un quipu</title>
                  <desc id="quipu-description">Una cuerda principal conecta cuatro hilos que representan catálogo, inventario, ventas y equipo.</desc>
                  <line class="main-cord" x1="20" x2="340" y1="36" y2="36"/>
                  <circle class="main-node" cx="20" cy="36" r="6"/>
                  <circle class="main-node" cx="340" cy="36" r="6"/>
                  <circle class="main-knot" cx="70" cy="36" r="5"/>
                  <circle class="main-knot" cx="150" cy="36" r="5"/>
                  <circle class="main-knot" cx="230" cy="36" r="5"/>
                  <circle class="main-knot" cx="300" cy="36" r="5"/>
                  <path class="thread thread-coral" d="M70 36V240"/>
                  <circle class="knot knot-coral" cx="70" cy="90" r="7"/>
                  <circle class="knot knot-coral" cx="70" cy="140" r="10"/>
                  <circle class="knot knot-coral" cx="70" cy="190" r="6"/>
                  <path class="thread thread-ochre" d="M150 36V260"/>
                  <circle class="knot knot-ochre" cx="150" cy="80" r="8"/>
                  <circle class="knot knot-ochre" cx="150" cy="130" r="11"/>
                  <circle class="knot knot-ochre" cx="150" cy="180" r="7"/>
                  <circle class="knot knot-ochre" cx="150" cy="225" r="9"/>
                  <path class="thread thread-green" d="M230 36V230"/>
                  <circle class="knot knot-green" cx="230" cy="100" r="9"/>
                  <circle class="knot knot-green" cx="230" cy="150" r="7"/>
                  <circle class="knot knot-green" cx="230" cy="200" r="10"/>
                  <path class="thread thread-blue" d="M300 36V210"/>
                  <circle class="knot knot-blue" cx="300" cy="85" r="6"/>
                  <circle class="knot knot-blue" cx="300" cy="135" r="8"/>
                  <circle class="knot knot-blue" cx="300" cy="175" r="7"/>
                </svg>
              </div>
              <div class="quipu-legend">
                <span><i class="legend-coral"></i>Catálogo</span>
                <span><i class="legend-ochre"></i>Inventario</span>
                <span><i class="legend-green"></i>Ventas</span>
                <span><i class="legend-blue"></i>Equipo</span>
              </div>
              <div class="panel-foot"><mat-icon aria-hidden="true">shield</mat-icon> Información aislada por farmacia y accesos por rol</div>
            </div>
          </div>
        </section>

        <section class="purpose section-tint" id="proposito">
          <div class="section-inner">
            <div class="section-intro">
              <div>
                <p class="eyebrow"><span></span> Desafíos en mostrador y trastienda</p>
                <h2>La operación diaria merece más claridad.</h2>
              </div>
              <p>Menos registros dispersos: reúne las tareas esenciales para consultar y organizar la farmacia.</p>
            </div>
            <div class="challenge-grid">
              <article class="challenge-card coral-edge">
                <span class="challenge-icon coral"><mat-icon aria-hidden="true">menu_book</mat-icon></span>
                <h3>Registros separados</h3>
                <p>Catálogo, movimientos y ventas organizados en sus propios módulos, disponibles desde el mismo espacio.</p>
                <span class="challenge-tag">Catálogo y kardex</span>
              </article>
              <article class="challenge-card ochre-edge">
                <span class="challenge-icon ochre"><mat-icon aria-hidden="true">event_busy</mat-icon></span>
                <h3>Fechas de vencimiento</h3>
                <p>Asocia lotes y vencimientos al inventario para consultar alertas y revisar existencias.</p>
                <span class="challenge-tag">Seguimiento por lote</span>
              </article>
              <article class="challenge-card coral-edge">
                <span class="challenge-icon coral"><mat-icon aria-hidden="true">production_quantity_limits</mat-icon></span>
                <h3>Stock difícil de seguir</h3>
                <p>Consulta cantidades disponibles y movimientos registrados para tener una vista más clara del stock.</p>
                <span class="challenge-tag">Existencias y movimientos</span>
              </article>
              <article class="challenge-card green-edge">
                <span class="challenge-icon green"><mat-icon aria-hidden="true">groups</mat-icon></span>
                <h3>Trabajo en equipo</h3>
                <p>Administra cuentas, roles y delegaciones para organizar quién puede acceder a cada función.</p>
                <span class="challenge-tag">Roles y permisos</span>
              </article>
            </div>
          </div>
        </section>

        <section class="tools" id="herramientas">
          <div class="section-inner">
            <div class="centered-heading">
              <p class="eyebrow"><span></span> Herramientas para el trabajo diario <span></span></p>
              <h2>Lo esencial, en un solo lugar.</h2>
              <p>Consulta y organiza la operación de tu farmacia desde módulos conectados.</p>
            </div>
            <div class="tools-grid">
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon coral"><mat-icon aria-hidden="true">medication</mat-icon></span><span class="feature-tag">Catálogo</span></div>
                <h3>Productos y categorías</h3>
                <p>Organiza productos, precios y categorías para mantener el catálogo accesible.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">inventory_2</mat-icon> Catálogo de la farmacia</div>
              </article>
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon ochre"><mat-icon aria-hidden="true">inventory_2</mat-icon></span><span class="feature-tag">Trazabilidad</span></div>
                <h3>Inventario y vencimientos</h3>
                <p>Registra ingresos por lote, fechas de vencimiento y consulta movimientos de kardex.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">calendar_month</mat-icon> Lotes y fechas</div>
              </article>
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon green"><mat-icon aria-hidden="true">point_of_sale</mat-icon></span><span class="feature-tag">Operación</span></div>
                <h3>Ventas e historial</h3>
                <p>Registra ventas, consulta su estado y revisa el historial de operaciones.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">receipt_long</mat-icon> Ventas registradas</div>
              </article>
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon blue"><mat-icon aria-hidden="true">groups</mat-icon></span><span class="feature-tag">Comunidad</span></div>
                <h3>Directorio de clientes</h3>
                <p>Consulta y administra los datos de contacto de los clientes de la farmacia.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">contact_page</mat-icon> Fichas de clientes</div>
              </article>
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon blue"><mat-icon aria-hidden="true">badge</mat-icon></span><span class="feature-tag">Equipo</span></div>
                <h3>Personal y usuarios</h3>
                <p>Gestiona registros del personal, cuentas de acceso y permisos según el rol.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">admin_panel_settings</mat-icon> Acceso por rol</div>
              </article>
              <article class="feature-card">
                <div class="feature-top"><span class="feature-icon green"><mat-icon aria-hidden="true">analytics</mat-icon></span><span class="feature-tag">Resumen</span></div>
                <h3>Dashboard</h3>
                <p>Consulta indicadores de clientes, productos, ventas y personal según tus permisos.</p>
                <div class="feature-meta"><mat-icon aria-hidden="true">query_stats</mat-icon> Resumen operativo</div>
              </article>
            </div>
          </div>
        </section>

        <section class="identity section-tint" id="identidad">
          <div class="section-inner identity-grid">
            <div class="identity-copy">
              <p class="eyebrow"><span></span> Identidad y metodología</p>
              <h2>Un saber que nos conecta con la gestión diaria.</h2>
              <p>
                El quipu organizaba información mediante cuerdas y nudos. Esa idea inspira KipuSalud:
                reunir tareas distintas y presentarlas con orden, claridad y una identidad cercana.
              </p>
              <p class="identity-note"><mat-icon aria-hidden="true">gesture</mat-icon> Una referencia cultural que da forma a la experiencia digital.</p>
            </div>
            <div class="color-guide" aria-label="Significado de los colores de KipuSalud">
              <article><span class="color-token coral"><mat-icon aria-hidden="true">shopping_cart_checkout</mat-icon></span><div><strong>Terracota <small>Acción</small></strong><p>Acciones principales y operaciones de salida.</p></div></article>
              <article><span class="color-token ochre"><mat-icon aria-hidden="true">warning</mat-icon></span><div><strong>Ocre <small>Atención</small></strong><p>Indicadores preventivos y alertas que requieren revisión.</p></div></article>
              <article><span class="color-token green"><mat-icon aria-hidden="true">check_circle</mat-icon></span><div><strong>Verde andino <small>Estado</small></strong><p>Estados positivos y elementos confirmados.</p></div></article>
              <article><span class="color-token blue"><mat-icon aria-hidden="true">account_tree</mat-icon></span><div><strong>Azul apagado <small>Estructura</small></strong><p>Información de organización, equipo y contexto.</p></div></article>
            </div>
          </div>
        </section>

        <section class="pharmacy-stories" aria-labelledby="pharmacy-stories-title">
          <div class="photo-heading">
            <div>
              <p class="eyebrow"><span></span> Cerca de cada comunidad</p>
              <h2 id="pharmacy-stories-title">Un espacio para cuidar,<br><em>con calidez y confianza.</em></h2>
            </div>
            <p>Detrás de cada farmacia hay personas que acompañan y hacen comunidad.</p>
          </div>
          <div class="photo-grid">
            <figure class="photo-card">
              <div class="photo-frame">
                <img src="/images/pharmacy-interior.jpg"
                     alt="Interior de una farmacia con mostrador y productos de cuidado"
                     width="600" height="449" loading="lazy" decoding="async">
                <span class="photo-label">Cuidado cercano</span>
              </div>
              <figcaption>
                <span>Un lugar de confianza para cada visita.</span>
                <small>“CVS/pharmacy Interior” · <a href="https://www.flickr.com/photos/67408512@N03/15550245072" target="_blank" rel="noopener noreferrer">Random Retail</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a></small>
              </figcaption>
            </figure>
            <figure class="photo-card">
              <div class="photo-frame">
                <img src="/images/pharmacy-counter.jpg"
                     alt="Pasillos y mostrador de una farmacia con señalización de farmacia"
                     width="600" height="449" loading="lazy" decoding="async">
                <span class="photo-label">Atención que acompaña</span>
              </div>
              <figcaption>
                <span>Todo empieza con escuchar.</span>
                <small>“CVS/pharmacy Interior” · <a href="https://www.flickr.com/photos/67408512@N03/14928645324" target="_blank" rel="noopener noreferrer">Random Retail</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a></small>
              </figcaption>
            </figure>
          </div>
        </section>

        <section class="access section-tint" id="para-farmacias">
          <div class="section-inner access-panel">
            <div class="access-copy">
              <p class="eyebrow"><span></span> Diseñado para el trabajo cotidiano</p>
              <h2>Tu farmacia, desde el navegador.</h2>
              <p>KipuSalud es una aplicación web alojada en la nube. El equipo autorizado puede acceder con conexión a internet y las credenciales de su farmacia.</p>
              <ul>
                <li><mat-icon aria-hidden="true">check</mat-icon> No requiere instalar un programa de escritorio.</li>
                <li><mat-icon aria-hidden="true">check</mat-icon> El acceso se organiza por farmacia y rol de usuario.</li>
                <li><mat-icon aria-hidden="true">check</mat-icon> Los módulos están disponibles desde equipos con navegador moderno.</li>
              </ul>
            </div>
            <div class="device-list" aria-label="Usos por dispositivo">
              <div><mat-icon aria-hidden="true">laptop_mac</mat-icon><span><strong>Computadora</strong><small>Catálogo, ventas y administración</small></span></div>
              <div><mat-icon aria-hidden="true">tablet_mac</mat-icon><span><strong>Tableta</strong><small>Consulta en el área de trabajo</small></span></div>
              <div><mat-icon aria-hidden="true">desktop_windows</mat-icon><span><strong>Navegador web</strong><small>Acceso según permisos de la cuenta</small></span></div>
              <p>Se requiere conexión a internet para utilizar la aplicación.</p>
            </div>
          </div>
        </section>

        <section class="closing">
          <span class="closing-mark" aria-hidden="true"><mat-icon>hub</mat-icon></span>
          <p class="eyebrow">KipuSalud</p>
          <h2>¿Listo para ordenar la gestión<br>de tu farmacia?</h2>
          <p>Reúne inventario, ventas y gestión del equipo en un solo espacio.</p>
          <div class="closing-actions">
            <a class="button button-primary" routerLink="/auth/registro">Comenzar ahora</a>
            <a class="button button-secondary" routerLink="/auth/login">Iniciar sesión</a>
          </div>
          <small>KipuSalud es una herramienta de gestión administrativa y logística para farmacias.</small>
        </section>
      </main>

      <footer class="site-footer">
        <a class="brand footer-brand" routerLink="/" aria-label="KipuSalud, inicio">
          <span class="brand-mark" aria-hidden="true"><img src="/kipusalud-mark.svg" alt=""></span>
          <span class="brand-copy"><strong>KipuSalud</strong><small>Gestión logística farmacéutica</small></span>
        </a>
        <p>Una gestión con raíces y propósito.</p>
        <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">Fotografías: Random Retail · CC BY 2.0</a>
        <span class="copyright">© KipuSalud</span>
      </footer>
    </div>
  `,
  styles: []
})
export class LandingComponent {}
