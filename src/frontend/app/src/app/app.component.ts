import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { FullscreenOverlayService } from './shared/fullscreen/fullscreen-overlay.service';
import { environment } from '../environments/environment';

/**
 * App-Shell: schlanke Toolbar (Titel, Sprache, Logout) + Router-Outlet. Der
 * FullscreenOverlayService wird hier app-weit instanziiert (hängt den CDK-Overlay-Container
 * während des Brett-Vollbilds INS Vollbild-Element — sonst wären Dialoge dort unsichtbar).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, MatButtonModule, MatIconModule, MatMenuModule, MatToolbarModule, MatTooltipModule, TranslatePipe],
  template: `
    <mat-toolbar class="rct-toolbar">
      <a routerLink="/trial" class="brand">
        <img src="favicon.svg" alt="" width="28" height="28">
        <span>{{ 'app.title' | translate }}</span>
      </a>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="langMenu" [matTooltip]="'app.language' | translate">
        <mat-icon>language</mat-icon>
      </button>
      <mat-menu #langMenu="matMenu">
        @for (l of locale.languages; track l.code) {
          <button mat-menu-item (click)="locale.use(l.code)">{{ l.label }}</button>
        }
      </mat-menu>
      @if (auth.isLoggedIn) {
        <span class="user">{{ auth.currentUser?.username }}</span>
        <button mat-icon-button (click)="auth.logout()" [matTooltip]="'app.logout' | translate">
          <mat-icon>logout</mat-icon>
        </button>
      }
    </mat-toolbar>
    <main class="rct-main">
      <router-outlet></router-outlet>
    </main>
    <footer class="rct-footer">Real Chess Training · v{{ version }}</footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .rct-toolbar { position: sticky; top: 0; z-index: 100; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font-weight: 500; }
    .spacer { flex: 1 1 auto; }
    .user { margin: 0 8px; opacity: 0.85; font-size: 0.95rem; }
    .rct-main { flex: 1 1 auto; }
    .rct-footer { text-align: center; padding: 10px; font-size: 0.75rem; opacity: 0.5; }
  `]
})
export class AppComponent {
  readonly version = environment.version;

  constructor(
    public auth: AuthService,
    public locale: LocaleService,
    // App-weit instanziieren (siehe Klassen-Doku) — Referenz genügt.
    _fullscreenOverlay: FullscreenOverlayService,
  ) {
    this.locale.init();
  }
}
