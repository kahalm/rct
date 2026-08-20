import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { ThemeService } from './core/theme.service';
import { FullscreenOverlayService } from './shared/fullscreen/fullscreen-overlay.service';
import { environment } from '../environments/environment';

/**
 * App-Shell nach RookHub-Muster („UI-Entrümpelung"): die Toolbar trägt nur Marke + ☰-Menü —
 * alles Sekundäre (Profil, Theme, Admin-Seiten, Abmelden) liegt IM Menü. So bleibt die Leiste
 * schmal genug, um im Kalkulations-Modus (body.calc-mode, styles.scss) oben rechts AUF der
 * Befehlszeile zu schweben: eine vereinte Kopfzeile statt zwei gestapelter.
 * Der FullscreenOverlayService wird hier app-weit instanziiert (hängt den CDK-Overlay-Container
 * während des Brett-Vollbilds INS Vollbild-Element — sonst wären Dialoge dort unsichtbar).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, MatButtonModule, MatIconModule, MatMenuModule, MatToolbarModule, MatTooltipModule, MatDividerModule, TranslatePipe],
  template: `
    <mat-toolbar class="rct-toolbar">
      <a routerLink="/trial" class="brand">
        <img src="favicon.svg" alt="" width="28" height="28">
        <span>{{ 'app.title' | translate }}</span>
      </a>
      <span class="spacer"></span>
      @if (auth.isLoggedIn) {
        <button mat-icon-button [matMenuTriggerFor]="mainMenu"
                [matTooltip]="'app.menu' | translate" [attr.aria-label]="'app.menu' | translate">
          <mat-icon>menu</mat-icon>
        </button>
        <mat-menu #mainMenu="matMenu">
          <div class="menu-user">{{ auth.currentUser?.username }}</div>
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/trial">
            <mat-icon>flag</mat-icon><span>{{ 'app.trial' | translate }}</span>
          </button>
          @if (auth.isAdmin) {
            <button mat-menu-item routerLink="/admin/chapters">
              <mat-icon>playlist_add</mat-icon><span>{{ 'app.addChapter' | translate }}</span>
            </button>
            <button mat-menu-item routerLink="/admin/users">
              <mat-icon>group</mat-icon><span>{{ 'app.users' | translate }}</span>
            </button>
          }
          <button mat-menu-item routerLink="/profile">
            <mat-icon>person</mat-icon><span>{{ 'app.profile' | translate }}</span>
          </button>
          <button mat-menu-item (click)="theme.toggle()">
            <mat-icon>{{ themeIcon }}</mat-icon><span>{{ themeLabel | translate }}</span>
          </button>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon><span>{{ 'app.logout' | translate }}</span>
          </button>
        </mat-menu>
      } @else {
        <!-- Anonym gibt es kein Menü — aber ohne Toggle steckten Anonyme unumkehrbar im
             Dunkel-Default fest (RookHub-Lektion), also bleibt genau dieser eine Knopf. -->
        <button mat-icon-button (click)="theme.toggle()" [matTooltip]="themeLabel | translate">
          <mat-icon>{{ themeIcon }}</mat-icon>
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
    .menu-user { padding: 8px 16px 6px; font-weight: 500; opacity: 0.7; font-size: 0.9rem; }
    .rct-main { flex: 1 1 auto; }
    .rct-footer { text-align: center; padding: 10px; font-size: 0.75rem; opacity: 0.5; }
  `]
})
export class AppComponent {
  readonly version = environment.version;

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    locale: LocaleService,
    // App-weit instanziieren (siehe Klassen-Doku) — Referenz genügt.
    _fullscreenOverlay: FullscreenOverlayService,
  ) {
    locale.init();   // English only — init setzt 'en' (locale.service)
  }

  // Icon/Tooltip zeigen die AKTIVE Einstellung (RookHub-Muster); Klick zyklt
  // system → light → dark (Default ist dark, siehe ThemeService).
  get themeIcon(): string {
    switch (this.theme.preference) {
      case 'system': return 'brightness_auto';
      case 'light': return 'light_mode';
      default: return 'dark_mode';
    }
  }

  get themeLabel(): string {
    switch (this.theme.preference) {
      case 'system': return 'app.themeSystem';
      case 'light': return 'app.themeLight';
      default: return 'app.themeDark';
    }
  }
}
