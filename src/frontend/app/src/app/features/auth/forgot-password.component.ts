import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { SnackbarService } from '../../core/snackbar.service';

/**
 * „Passwort vergessen" — aus RookHub portiert und auf RCT reduziert. Der Server
 * antwortet aus Datenschutzgründen IMMER 200, daher zeigt die Seite nach dem
 * Absenden dieselbe neutrale Bestätigung, egal ob die Adresse existiert.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'auth.forgot.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (sent) {
            <p class="auth-info">{{ 'auth.forgot.sent' | translate }}</p>
          } @else {
            <form (ngSubmit)="onSubmit()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.forgot.emailLabel' | translate }}</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required email autofocus>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading || !email.trim()">
                {{ loading ? ('auth.forgot.submitting' | translate) : ('auth.forgot.submit' | translate) }}
              </button>
            </form>
          }
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/login">{{ 'auth.forgot.backToLogin' | translate }}</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; }
    mat-card { width: 400px; max-width: 90vw; }
    .auth-info { background: rgba(144, 202, 249, 0.15); border-left: 3px solid #90caf9; padding: 0.6rem 0.8rem; border-radius: 4px; margin: 0.5rem 0 0; font-size: 0.9rem; }
    .auth-form { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; }
    mat-form-field { width: 100%; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;

  constructor(private auth: AuthService, private snackbar: SnackbarService, private translate: TranslateService) {}

  onSubmit(): void {
    this.loading = true;
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message
          || (err.error?.errors && Object.values(err.error.errors).flat().join(' '))
          || this.translate.instant('common.error');
        this.snackbar.warn(msg);
      }
    });
  }
}
