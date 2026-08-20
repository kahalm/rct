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
import { AuthPrefillService } from '../../core/auth-prefill.service';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'auth.register.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.register.usernameLabel' | translate }}</mat-label>
              <input matInput [(ngModel)]="username" name="username" required minlength="3">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.register.emailLabel' | translate }}</mat-label>
              <!-- RCT: E-Mail ist PFLICHT (anders als RookHub). -->
              <input matInput type="email" [(ngModel)]="email" name="email" required email>
              <mat-hint>{{ 'auth.register.emailHint' | translate }}</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.register.passwordLabel' | translate }}</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="8">
              <mat-hint>{{ 'auth.register.passwordHint' | translate }}</mat-hint>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="loading || !email.trim()">
              {{ loading ? ('auth.register.submitting' | translate) : ('auth.register.submit' | translate) }}
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/login" [queryParams]="{ returnUrl: returnUrl }">{{ 'auth.register.loginLink' | translate }}</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    mat-card { width: 400px; max-width: 90vw; }
    .auth-form { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; }
    mat-form-field { width: 100%; }
    /* Material reserviert für Hints nur EINE Zeile (Hint-Wrapper ist absolut positioniert) —
       ein umbrechender Hint (schmale Screens) malte sonst über das nächste Feld. */
    ::ng-deep .auth-form .mat-mdc-form-field-subscript-wrapper { height: auto; }
    ::ng-deep .auth-form .mat-mdc-form-field-hint-wrapper { position: static; }
  `]
})
export class RegisterComponent {
  // username/email/password über den Prefill-Service, damit die Eingaben beim
  // Wechsel zum Login (und zurück) erhalten bleiben.
  get username(): string { return this.prefill.username; }
  set username(v: string) { this.prefill.username = v; }
  get email(): string { return this.prefill.email; }
  set email(v: string) { this.prefill.email = v; }
  get password(): string { return this.prefill.password; }
  set password(v: string) { this.prefill.password = v; }
  loading = false;

  returnUrl: string;

  constructor(private auth: AuthService, private prefill: AuthPrefillService, private router: Router, private route: ActivatedRoute, private snackbar: SnackbarService, private translate: TranslateService) {
    const raw = this.route.snapshot.queryParams['returnUrl'] || '/trial';
    this.returnUrl = this.sanitizeReturnUrl(raw);
  }

  private sanitizeReturnUrl(url: string): string {
    if (!url.startsWith('/') || url.startsWith('//') || url.includes('://')) return '/trial';
    return url;
  }

  onSubmit(): void {
    this.loading = true;
    // RCT: E-Mail ist Pflicht — getrimmt senden (Backend normalisiert auf lowercase).
    this.auth.register(this.username, this.email.trim(), this.password).subscribe({
      next: () => {
        this.prefill.clear();
        // navigateByUrl (nicht navigate([...])): returnUrl ist ein kompletter Pfad.
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.loading = false;
        const msg = extractHttpErrorMessage(err, this.translate.instant('auth.register.failed'));
        this.snackbar.warn(msg);
      }
    });
  }
}
