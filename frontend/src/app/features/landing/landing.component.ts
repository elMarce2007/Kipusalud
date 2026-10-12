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
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none">
              <path d="M11 7v29M21 7v29M31 7v29" />
              <path d="M11 15c5 0 5 5 10 5s5-5 10-5M11 27c5 0 5-5 10-5s5 5 10 5" />
              <circle cx="11" cy="11" r="2.5" /><circle cx="21" cy="24" r="2.5" />
              <circle cx="31" cy="31" r="2.5" />
            </svg>
          </span>
          <span class="brand-name">kipu<span>salud</span></span>
        </a>

        <nav class="main-nav" aria-label="Navegación principal">
          <a href="#proposito">Nuestro propósito</a>
          <a href="#herramientas">Herramientas</a>
        </nav>

        <a class="header-action" routerLink="/auth/login">
          Ingresar <mat-icon aria-hidden="true">arrow_forward</mat-icon>
        </a>
      </header>

      <main>
        <section class="hero" id="proposito">
          <div class="hero-copy">
            <p class="eyebrow"><span></span> Gestión farmacéutica con identidad</p>
            <h1>Cuidar la salud,<br>también es cuidar<br><em>lo que somos.</em></h1>
            <p class="intro">
              KipuSalud reúne lo esencial de tu farmacia en un solo lugar.
              Una forma más clara y humana de cuidar cada detalle.
            </p>
            <div class="hero-actions">
              <a class="button button-primary" routerLink="/auth/login">
                Conoce KipuSalud <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              </a>
              <a class="text-link" href="#herramientas">Explorar herramientas</a>
            </div>
            <div class="trust-note">
              <span class="trust-icon"><mat-icon aria-hidden="true">favorite</mat-icon></span>
              <span>Hecho para acompañar el cuidado de cada comunidad.</span>
            </div>
          </div>

          <div class="hero-art" aria-label="Ilustración de un quipu andino">
            <div class="art-caption"><span>Un saber que nos conecta</span><span>01 — 04</span></div>
            <svg class="quipu-art" viewBox="0 0 560 470" fill="none" role="img"
                 aria-labelledby="quipu-title">
              <title id="quipu-title">Cuerdas y nudos inspirados en un quipu</title>
              <path class="cord cord-main" d="M276 26c-5 54 8 82-4 130-12 49 8 91-4 140-11 46 6 84 0 145" />
              <path class="cord cord-red" d="M276 105c-36 14-60 21-88 47-28 26-25 50-49 76-21 23-34 50-45 95" />
              <path class="cord cord-blue" d="M276 135c38 2 66 9 98 29 31 20 38 48 65 69 25 20 44 45 59 81" />
              <path class="cord cord-gold" d="M274 212c-35 3-67 17-90 39-23 22-36 42-64 54" />
              <path class="cord cord-green" d="M272 244c40 3 69 19 90 40 22 22 35 40 69 56" />
              <path class="cord cord-red-light" d="M270 308c-29 5-48 19-61 36-13 17-21 32-43 45" />
              <path class="cord cord-blue-light" d="M270 333c31 5 51 21 65 40 13 18 26 31 47 44" />
              <g class="knots">
                <circle cx="276" cy="105" r="10" /><circle cx="184" cy="152" r="8" />
                <circle cx="373" cy="164" r="9" /><circle cx="141" cy="278" r="8" />
                <circle cx="439" cy="233" r="8" /><circle cx="184" cy="251" r="7" />
                <circle cx="362" cy="284" r="8" /><circle cx="208" cy="344" r="8" />
                <circle cx="335" cy="373" r="7" />
              </g>
              <circle class="sun" cx="276" cy="26" r="13" />
              <path class="sun-ray" d="M276 5v-4m0 50v-4m21-21h4m-50 0h4m36-15 3-3m-36 36 3-3m30 0 3 3m-36-36 3 3" />
            </svg>
            <div class="art-note note-left"><span class="note-dot coral"></span> Historia</div>
            <div class="art-note note-right"><span class="note-dot blue"></span> Cuidado</div>
            <div class="art-note note-bottom"><span class="note-dot gold"></span> Comunidad</div>
          </div>
        </section>

        <section class="tools" id="herramientas">
          <div class="section-heading">
            <p class="eyebrow"><span></span> Todo conectado</p>
            <h2>Orden para tu día.<br><em>Tiempo para cuidar.</em></h2>
            <p>Las tareas de siempre, ahora más sencillas y en sintonía.</p>
          </div>
          <div class="tool-list">
            <article class="tool-card">
              <span class="tool-icon coral"><mat-icon aria-hidden="true">inventory_2</mat-icon></span>
              <div><h3>Productos y stock</h3><p>Ten a la vista lo que tienes y lo que hace falta.</p></div>
              <span class="card-number">01</span>
            </article>
            <article class="tool-card">
              <span class="tool-icon ochre"><mat-icon aria-hidden="true">receipt_long</mat-icon></span>
              <div><h3>Ventas claras</h3><p>Registra cada venta y sigue el movimiento del día.</p></div>
              <span class="card-number">02</span>
            </article>
            <article class="tool-card">
              <span class="tool-icon green"><mat-icon aria-hidden="true">groups</mat-icon></span>
              <div><h3>Personas y equipo</h3><p>Organiza tus contactos y trabaja en comunidad.</p></div>
              <span class="card-number">03</span>
            </article>
          </div>
        </section>

        <section class="closing">
          <div class="closing-knot" aria-hidden="true">✳</div>
          <div>
            <p class="eyebrow">KipuSalud</p>
            <h2>La gestión también puede<br><em>sentirse cercana.</em></h2>
          </div>
          <a class="button button-light" routerLink="/auth/login">
            Ingresar a mi espacio <mat-icon aria-hidden="true">arrow_forward</mat-icon>
          </a>
        </section>
      </main>

      <footer class="site-footer">
        <a class="brand footer-brand" routerLink="/">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none">
              <path d="M11 7v29M21 7v29M31 7v29M11 15c5 0 5 5 10 5s5-5 10-5M11 27c5 0 5-5 10-5s5 5 10 5" />
              <circle cx="11" cy="11" r="2.5" /><circle cx="21" cy="24" r="2.5" />
              <circle cx="31" cy="31" r="2.5" />
            </svg>
          </span>
          <span class="brand-name">kipu<span>salud</span></span>
        </a>
        <p>Una gestión con raíces y propósito.</p>
        <span class="copyright">© KipuSalud</span>
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; }
    .landing {
      --ink: #29271f; --muted: #716b5e; --paper: #faf7ef; --line: #e9e1d1;
      --coral: #b94c37; --ochre: #c18a28; --green: #456b53; --blue: #557c91;
      min-height: 100vh; overflow: hidden; color: var(--ink); background: var(--paper);
      font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
      background-image: linear-gradient(90deg, transparent 49.9%, rgba(111, 89, 55, .025) 50%, transparent 50.1%);
    }
    .site-header {
      height: 82px; padding: 0 clamp(24px, 7vw, 104px); display: flex; align-items: center;
      justify-content: space-between; border-bottom: 1px solid var(--line);
      border-top: 4px solid transparent;
      border-image: repeating-linear-gradient(90deg, var(--coral) 0 34px, var(--ochre) 34px 68px,
        var(--green) 68px 102px, var(--blue) 102px 136px) 1;
    }
    .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); }
    .brand-mark { width: 38px; height: 38px; display: grid; place-items: center; }
    .brand-mark svg { width: 100%; height: 100%; stroke: var(--coral); stroke-width: 1.8; stroke-linecap: round; }
    .brand-mark circle { fill: var(--ochre); stroke: none; }
    .brand-name { font-family: Georgia, serif; font-size: 22px; letter-spacing: -.7px; font-weight: 700; }
    .brand-name span { color: var(--coral); font-weight: 400; }
    .main-nav { display: flex; align-items: center; gap: clamp(22px, 4vw, 54px); }
    .main-nav a, .text-link { color: var(--muted); text-decoration: none; font-size: 13px; }
    .main-nav a:hover, .text-link:hover { color: var(--coral); }
    .header-action { display: inline-flex; gap: 8px; align-items: center; color: var(--coral); text-decoration: none; font-size: 13px; font-weight: 600; }
    .header-action mat-icon, .button mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .hero {
      max-width: 1240px; min-height: 570px; margin: auto; padding: 70px 7% 62px;
      display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 30px;
    }
    .eyebrow { display: flex; align-items: center; gap: 10px; margin: 0 0 21px; color: var(--green); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    .eyebrow > span { width: 24px; height: 1px; background: var(--ochre); }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 22px; font: 500 clamp(40px, 5.1vw, 66px)/1.04 Georgia, 'Times New Roman', serif; letter-spacing: -2px; }
    h1 em, h2 em { color: var(--coral); font-weight: 400; }
    .intro { max-width: 440px; margin-bottom: 29px; color: var(--muted); font-size: 15px; line-height: 1.8; }
    .hero-actions { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 13px; min-height: 47px; padding: 0 20px; border-radius: 3px; text-decoration: none; font-size: 12px; font-weight: 600; transition: transform .2s, box-shadow .2s; }
    .button:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(41, 39, 31, .13); }
    .button-primary { color: #fffaf1; background: var(--coral); }
    .text-link { text-decoration: underline; text-decoration-color: #cdbd9f; text-underline-offset: 5px; }
    .trust-note { display: flex; align-items: center; gap: 11px; margin-top: 47px; color: #777061; font-size: 11px; }
    .trust-icon { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #e4d8c5; border-radius: 50%; color: var(--coral); }
    .trust-icon mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .hero-art { position: relative; min-height: 420px; display: flex; align-items: center; justify-content: center; }
    .hero-art:before { content: ''; position: absolute; width: min(83%, 390px); aspect-ratio: 1; border-radius: 50%; background: #f0eadb; }
    .hero-art:after { content: ''; position: absolute; width: min(67%, 310px); aspect-ratio: 1; border: 1px solid #e4dac7; border-radius: 50%; }
    .art-caption { position: absolute; z-index: 1; inset: 17px 0 auto; display: flex; justify-content: space-between; color: #877d68; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
    .quipu-art { position: relative; z-index: 1; width: min(100%, 470px); height: auto; overflow: visible; }
    .cord { stroke-width: 4; stroke-linecap: round; }
    .cord-main { stroke: #9a6c31; stroke-width: 6; }
    .cord-red, .cord-red-light { stroke: var(--coral); }
    .cord-blue, .cord-blue-light { stroke: var(--blue); }
    .cord-gold { stroke: var(--ochre); }.cord-green { stroke: var(--green); }
    .cord-red-light, .cord-blue-light { stroke-width: 3; }
    .knots circle { fill: var(--paper); stroke: var(--ochre); stroke-width: 4; }
    .sun { fill: var(--ochre); }.sun-ray { stroke: var(--ochre); stroke-width: 2; stroke-linecap: round; }
    .art-note { position: absolute; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #e7dfd0; background: rgba(250, 247, 239, .92); color: #635d51; font: 11px Georgia, serif; }
    .note-left { left: 0; top: 28%; }.note-right { right: -4px; top: 48%; }.note-bottom { bottom: 15px; left: 22%; }
    .note-dot { width: 7px; height: 7px; border-radius: 50%; }.note-dot.coral { background: var(--coral); }.note-dot.blue { background: var(--blue); }.note-dot.gold { background: var(--ochre); }
    .tools { border-top: 1px solid var(--line); padding: 80px 8% 87px; display: grid; grid-template-columns: .8fr 1.2fr; gap: 9%; }
    .section-heading h2, .closing h2 { margin-bottom: 15px; font: 500 clamp(31px, 3.6vw, 44px)/1.12 Georgia, serif; letter-spacing: -1px; }
    .section-heading > p:last-child { max-width: 300px; color: var(--muted); font-size: 13px; line-height: 1.7; }
    .tool-list { border-top: 1px solid var(--line); }
    .tool-card { display: grid; grid-template-columns: 46px 1fr auto; align-items: center; gap: 16px; min-height: 100px; border-bottom: 1px solid var(--line); }
    .tool-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; }
    .tool-icon mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .tool-icon.coral { background: #f4e3dc; color: var(--coral); }.tool-icon.ochre { background: #f3ead6; color: #9a711d; }.tool-icon.green { background: #e2ebe1; color: var(--green); }
    .tool-card h3 { margin-bottom: 5px; font: 600 15px Georgia, serif; }
    .tool-card p { margin-bottom: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
    .card-number { color: #9d927e; font-size: 10px; letter-spacing: 1px; }
    .closing { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 52px 8%; background: #315947; color: #fffaf1; }
    .closing:before { content: ''; position: absolute; inset: auto 0 0; height: 5px; background: repeating-linear-gradient(90deg, var(--coral) 0 34px, var(--ochre) 34px 68px, #d7bd7c 68px 102px, #77917a 102px 136px); }
    .closing-knot { position: absolute; right: 40%; top: 18px; color: rgba(255,255,255,.08); font-size: 98px; }
    .closing .eyebrow { margin-bottom: 12px; color: #d5c69e; }.closing h2 { margin-bottom: 0; }
    .closing h2 em { color: #edc47c; }.button-light { flex: none; color: #315947; background: #faf5e9; }
    .site-footer { min-height: 92px; padding: 18px 8%; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .footer-brand .brand-mark { width: 30px; height: 30px; }.footer-brand .brand-name { font-size: 18px; }
    .site-footer p, .copyright { margin: 0; color: #847b6c; font-size: 10px; }
    @media (max-width: 760px) {
      .site-header { height: 70px; padding: 0 22px; }.main-nav { display: none; }
      .hero { grid-template-columns: 1fr; padding: 58px 8% 36px; gap: 15px; }
      h1 { font-size: clamp(42px, 10vw, 60px); }.hero-art { min-height: 350px; }
      .quipu-art { max-width: 390px; }.tools { grid-template-columns: 1fr; padding: 58px 8%; gap: 24px; }
      .closing { align-items: flex-start; flex-direction: column; padding: 43px 8%; }.closing-knot { right: 8%; top: 7px; }
      .site-footer { flex-wrap: wrap; padding: 22px 8%; }.site-footer p { order: 1; width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) { *, *:before, *:after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
  `
})
export class LandingComponent {}
