import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';

/**
 * Profil-Seite — bewusst EINE schlanke Seite mit drei Karten:
 * Konto (Benutzername/E-Mail), Passwort ändern, Gefahrenzone (Konto löschen).
 * Kein RookHub-Schachprofil (FIDE/Lichess/…) — RCT kennt nur die Konto-Basisdaten.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="profile-container">
      <h1>{{ 'profile.title' | translate }}</h1>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'profile.account.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (loaded) {
            <form (ngSubmit)="saveAccount()" class="profile-form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'profile.account.username' | translate }}</mat-label>
                <input matInput [(ngModel)]="username" name="username" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'profile.account.email' | translate }}</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required email>
              </mat-form-field>
              @if (emailChanged) {
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'profile.account.confirmPassword' | translate }}</mat-label>
                  <input matInput type="password" [(ngModel)]="accountPassword" name="accountPassword" required autocomplete="current-password">
                  <mat-hint>{{ 'profile.account.confirmPasswordHint' | translate }}</mat-hint>
                </mat-form-field>
              }
              <button mat-raised-button color="primary" type="submit" [disabled]="savingAccount || !username.trim() || !email.trim() || (emailChanged && !accountPassword)">
                {{ 'profile.account.save' | translate }}
              </button>
            </form>
          } @else {
            <p class="muted">{{ 'common.loading' | translate }}</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'profile.password.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onChangePassword()" class="profile-form">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'profile.password.current' | translate }}</mat-label>
              <input matInput type="password" [(ngModel)]="currentPassword" name="currentPassword" required autocomplete="current-password">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'profile.password.new' | translate }}</mat-label>
              <input matInput type="password" [(ngModel)]="newPassword" name="newPassword" required minlength="8" autocomplete="new-password">
              <mat-hint>{{ 'auth.register.passwordHint' | translate }}</mat-hint>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="changingPassword || !currentPassword || newPassword.length < 8">
              {{ 'profile.password.save' | translate }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="danger-card">
        <mat-card-header>
          <mat-card-title>{{ 'profile.delete.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="danger-hint">{{ 'profile.delete.hint' | translate }}</p>
          <form (ngSubmit)="onDeleteAccount()" class="profile-form">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'profile.delete.password' | translate }}</mat-label>
              <input matInput type="password" [(ngModel)]="deletePassword" name="deletePassword" required autocomplete="current-password">
            </mat-form-field>
            <button mat-raised-button color="warn" type="submit" [disabled]="deleting || !deletePassword">
              {{ 'profile.delete.button' | translate }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 560px; margin: 0 auto; padding: 1.5rem 1rem 3rem; display: flex; flex-direction: column; gap: 1.25rem; }
    h1 { font-size: 1.4rem; margin: 0; }
    .profile-form { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; align-items: flex-start; }
    mat-form-field { width: 100%; }
    .muted { opacity: 0.7; }
    .danger-card { border: 1px solid rgba(244, 67, 54, 0.45); }
    .danger-hint { margin: 0.5rem 0 0; font-size: 0.9rem; }
  `]
})
export class ProfileComponent implements OnInit {
  // Karte „Konto"
  username = '';
  email = '';
  accountPassword = '';
  private originalUsername = '';
  private originalEmail = '';
  loaded = false;
  savingAccount = false;

  /** E-Mail-Änderung? Dann verlangt der Server das aktuelle Passwort (Takeover-Schutz). */
  get emailChanged(): boolean {
    return this.email.trim().toLowerCase() !== this.originalEmail;
  }

  // Karte „Passwort ändern"
  currentPassword = '';
  newPassword = '';
  changingPassword = false;

  // Karte „Gefahrenzone"
  deletePassword = '';
  deleting = false;

  constructor(
    private profile: ProfileService,
    private auth: AuthService,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.profile.get().subscribe({
      next: p => {
        this.username = p.username;
        this.email = p.email;
        this.originalUsername = p.username;
        this.originalEmail = p.email.toLowerCase();
        this.loaded = true;
      },
      error: () => {
        this.loaded = true;
        this.snackbar.warn(this.translate.instant('common.error'));
      }
    });
  }

  saveAccount(): void {
    this.savingAccount = true;
    this.profile.update({
      username: this.username.trim(),
      email: this.email.trim(),
      // Nur bei E-Mail-Änderung nötig; sonst gar nicht mitschicken.
      currentPassword: this.emailChanged ? this.accountPassword : undefined,
    }).subscribe({
      next: p => {
        this.savingAccount = false;
        const usernameChanged = p.username !== this.originalUsername;
        this.username = p.username;
        this.email = p.email;
        this.originalUsername = p.username;
        this.originalEmail = p.email.toLowerCase();
        this.accountPassword = '';
        if (usernameChanged) {
          // Toolbar sofort nachziehen; der Hinweis ersetzt das „gespeichert"-Snackbar
          // (MatSnackBar zeigt ohnehin nur das jeweils letzte an).
          this.auth.updateStoredUsername(p.username);
          this.snackbar.show(this.translate.instant('profile.account.usernameChangedHint'), { duration: 6000 });
        } else {
          this.snackbar.success(this.translate.instant('profile.account.saved'));
        }
      },
      error: err => {
        this.savingAccount = false;
        const msg = extractHttpErrorMessage(err, this.translate.instant('common.error'));
        this.snackbar.warn(msg);
      }
    });
  }

  onChangePassword(): void {
    this.changingPassword = true;
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.changingPassword = false;
        this.currentPassword = '';
        this.newPassword = '';
        // auth.service hat das frische Token (rotierter Security-Stamp) bereits gespeichert —
        // die Session läuft nahtlos weiter, kein Re-Login nötig.
        this.snackbar.success(this.translate.instant('profile.password.changed'));
      },
      error: err => {
        this.changingPassword = false;
        const msg = extractHttpErrorMessage(err, this.translate.instant('common.error'));
        this.snackbar.warn(msg);
      }
    });
  }

  onDeleteAccount(): void {
    if (!confirm(this.translate.instant('profile.delete.confirm'))) return;
    this.deleting = true;
    this.auth.deleteAccount(this.deletePassword).subscribe({
      // Erfolg: logout() läuft bereits im Service (tap) und leitet auf /login um.
      next: () => {},
      error: err => {
        this.deleting = false;
        const msg = extractHttpErrorMessage(err, this.translate.instant('profile.delete.failed'));
        this.snackbar.warn(msg);
      }
    });
  }
}
