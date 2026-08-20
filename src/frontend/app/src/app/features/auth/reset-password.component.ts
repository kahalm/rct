import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';

/**
 * Neues Passwort über den Reset-Link setzen (?token= aus der Mail). Aus RookHub
 * portiert und auf RCT reduziert: ein Passwortfeld (min. 8 Zeichen wie bei der
 * Registrierung); ohne/mit ungültigem Token erklärt dieselbe „invalid"-Meldung.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'auth.reset.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (!token) {
            <p class="auth-info">{{ 'auth.reset.invalid' | translate }}</p>
          } @else {
            <form (ngSubmit)="onSubmit()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.reset.passwordLabel' | translate }}</mat-label>
                <input matInput type="password" [(ngModel)]="password" name="password" required minlength="8" autofocus>
                <mat-hint>{{ 'auth.reset.passwordHint' | translate }}</mat-hint>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading || password.length < 8">
                {{ loading ? ('auth.reset.submitting' | translate) : ('auth.reset.submit' | translate) }}
              </button>
            </form>
          }
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/forgot-password">{{ 'auth.forgot.title' | translate }}</a>
          <a mat-button routerLink="/login">{{ 'auth.forgot.backToLogin' | translate }}</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; }
    mat-card { width: 400px; max-width: 90vw; }
    .auth-info { background: rgba(144, 202, 249, 0.15); border-left: 3px solid #90caf9; padding: 0.6rem 0.8rem; border-radius: 4px; margin: 0.5rem 0 0; font-size: 0.9rem; }
    .auth-form { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; }
    mat-form-field { width: 100%; }
  `]
})
export class ResetPasswordComponent {
  token = '';
  password = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute, private snackbar: SnackbarService, private translate: TranslateService) {
    this.token = this.route.snapshot.queryParams['token'] || '';
  }

  onSubmit(): void {
    this.loading = true;
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.snackbar.success(this.translate.instant('auth.reset.success'));
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        const msg = extractHttpErrorMessage(err, this.translate.instant('auth.reset.invalid'));
        this.snackbar.warn(msg);
      }
    });
  }
}
