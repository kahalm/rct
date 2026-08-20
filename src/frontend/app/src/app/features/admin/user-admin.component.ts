import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  courseAccess: boolean;
  createdAt: string;
}

/**
 * User-Verwaltung (nur Admin): alle registrierten Konten mit Suche und Filter auf die
 * Kurs-Freischaltung; der Schalter je Zeile vergibt/entzieht sie sofort. Die Freischaltung
 * steuert NUR die Sichtbarkeit der Kurs-Kapitel — die Trial-Stellungen sieht jeder.
 * Client-seitige Filterung, bewusst ohne Paging (Portal-Größenordnung; der Server liefert
 * die aktive Kontoliste komplett).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-user-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonToggleModule, MatSlideToggleModule, MatIconModule, MatTooltipModule, TranslatePipe],
  template: `
    <div class="users-container">
      <h1>{{ 'admin.users.title' | translate }}</h1>
      <mat-card>
        <mat-card-content>
          <div class="users-controls">
            <mat-form-field appearance="outline" class="users-search" subscriptSizing="dynamic">
              <mat-label>{{ 'admin.users.search' | translate }}</mat-label>
              <input matInput [(ngModel)]="search" [attr.aria-label]="'admin.users.search' | translate">
            </mat-form-field>
            <mat-button-toggle-group [(ngModel)]="accessFilter" [attr.aria-label]="'admin.users.filter' | translate">
              <mat-button-toggle value="all">{{ 'admin.users.filterAll' | translate }}</mat-button-toggle>
              <mat-button-toggle value="granted">{{ 'admin.users.filterGranted' | translate }}</mat-button-toggle>
              <mat-button-toggle value="locked">{{ 'admin.users.filterLocked' | translate }}</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          @if (loading) {
            <p class="muted">{{ 'common.loading' | translate }}</p>
          } @else {
            <p class="users-count">{{ 'admin.users.count' | translate: { shown: filtered().length, total: users.length, granted: grantedCount() } }}</p>
            <div class="users-table-wrap">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>{{ 'admin.users.colUser' | translate }}</th>
                    <th>{{ 'admin.users.colEmail' | translate }}</th>
                    <th>{{ 'admin.users.colRegistered' | translate }}</th>
                    <th>{{ 'admin.users.colCourse' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of filtered(); track u.id) {
                    <tr>
                      <td>
                        {{ u.username }}
                        @if (u.isAdmin) { <mat-icon class="admin-mark" [matTooltip]="'admin.users.isAdmin' | translate">shield</mat-icon> }
                      </td>
                      <td class="email-cell">{{ u.email }}</td>
                      <td>{{ u.createdAt | date:'mediumDate' }}</td>
                      <td>
                        <mat-slide-toggle [checked]="u.courseAccess" [disabled]="busyIds.has(u.id)"
                                          (change)="setAccess(u, $event.checked)">
                          {{ (u.courseAccess ? 'admin.users.granted' : 'admin.users.locked') | translate }}
                        </mat-slide-toggle>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="muted">{{ 'admin.users.empty' | translate }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .users-container { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    h1 { font-size: 1.4rem; margin: 0 0 1rem; }
    .users-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding-top: 8px; }
    .users-search { flex: 1 1 240px; }
    .users-count { margin: 10px 2px 4px; font-size: 0.85rem; opacity: 0.7; }
    .users-table-wrap { overflow-x: auto; }
    .users-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    .users-table th { text-align: left; font-weight: 500; opacity: 0.7; padding: 8px 12px; border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
    .users-table td { padding: 8px 12px; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); }
    .email-cell { word-break: break-all; }
    .admin-mark { font-size: 16px; width: 16px; height: 16px; vertical-align: text-bottom; margin-left: 4px; opacity: 0.6; }
    .muted { opacity: 0.7; }
  `]
})
export class UserAdminComponent implements OnInit {
  users: AdminUser[] = [];
  loading = true;
  search = '';
  accessFilter: 'all' | 'granted' | 'locked' = 'all';
  /** Zeilen mit laufendem Speichern — deren Schalter sind gesperrt (kein Doppel-Klick-Rennen). */
  busyIds = new Set<number>();

  constructor(
    private http: HttpClient,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.http.get<AdminUser[]>('/api/admin/users').subscribe({
      next: users => { this.users = users; this.loading = false; },
      error: err => {
        this.loading = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }

  filtered(): AdminUser[] {
    const q = this.search.trim().toLowerCase();
    return this.users.filter(u =>
      (this.accessFilter === 'all' || (this.accessFilter === 'granted') === u.courseAccess)
      && (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }

  grantedCount(): number {
    return this.users.reduce((n, u) => n + (u.courseAccess ? 1 : 0), 0);
  }

  setAccess(user: AdminUser, access: boolean): void {
    this.busyIds.add(user.id);
    this.http.put<AdminUser>(`/api/admin/users/${user.id}/course-access`, { access }).subscribe({
      next: updated => {
        this.busyIds.delete(user.id);
        user.courseAccess = updated.courseAccess;
      },
      error: err => {
        this.busyIds.delete(user.id);
        // Schalter zurück auf den Server-Stand (der Toggle hat optimistisch geschaltet).
        user.courseAccess = !access;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }
}
