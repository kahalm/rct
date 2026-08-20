import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';
import { TRIAL_BOOK_ID } from '../trial/trial.component';

/**
 * Kapitel-Authoring (nur Admin, eigene Seite — vorher eine Karte auf /trial): FEN-Memo im
 * RookHub-Format als neues/erweitertes Kapitel ans Trial-Buch anfügen. Übersprungene Zeilen
 * werden mit Zeilennummer, Grund und Originaltext gelistet.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-chapter-authoring',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <div class="author-container">
      <h1>{{ 'admin.author.title' | translate }}</h1>
      <mat-card>
        <mat-card-content class="author-form">
          <p class="hint">{{ 'admin.author.hint' | translate }}</p>
          <mat-form-field appearance="outline" class="author-name">
            <mat-label>{{ 'admin.author.chapter' | translate }}</mat-label>
            <input matInput [(ngModel)]="authorChapter" maxlength="200" [disabled]="authorBusy">
          </mat-form-field>
          <mat-form-field appearance="outline" class="author-fens">
            <mat-label>{{ 'admin.author.fens' | translate }}</mat-label>
            <textarea matInput rows="10" [(ngModel)]="authorFens" [disabled]="authorBusy"
                      placeholder="r1b2rk1/pppq1ppp/1bn5/8/3N4/4BB2/PPPQ1PPP/R3K2R w KQ - 0 1 | comment…"></textarea>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="addChapter()"
                  [disabled]="authorBusy || !authorChapter.trim() || !authorFens.trim()">
            <mat-icon>playlist_add</mat-icon> {{ 'admin.author.add' | translate }}
          </button>
          @if (authorErrors.length > 0) {
            <ul class="author-errors">
              @for (e of authorErrors; track e.lineNumber) {
                <li>
                  <strong>{{ 'admin.author.line' | translate: { line: e.lineNumber } }}:</strong>
                  {{ ('admin.author.err.' + e.reason) | translate }}
                  @if (e.text) { <code>{{ e.text }}</code> }
                </li>
              }
            </ul>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .author-container { max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    h1 { font-size: 1.4rem; margin: 0 0 1rem; }
    .author-form { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; }
    .hint { margin: 0; opacity: 0.75; font-size: 0.9rem; }
    mat-form-field { width: 100%; }
    button { align-self: flex-start; }
    .author-errors {
      margin: 4px 0 0; padding-left: 20px; font-size: 0.85rem; color: #e57373;
      li { margin-bottom: 4px; }
      code { opacity: 0.8; word-break: break-all; }
    }
  `]
})
export class ChapterAuthoringComponent {
  authorChapter = '';
  authorFens = '';
  authorBusy = false;
  authorErrors: { lineNumber: number; reason: string; text?: string }[] = [];

  constructor(
    private http: HttpClient,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  addChapter(): void {
    const chapter = this.authorChapter.trim();
    if (!chapter || !this.authorFens.trim() || this.authorBusy) return;
    this.authorBusy = true;
    this.authorErrors = [];
    this.http.post<{ added: number; errors: { lineNumber: number; reason: string; text?: string }[] }>(
      `/api/calculations/books/${TRIAL_BOOK_ID}/chapters`,
      { chapter, fenList: this.authorFens },
    ).subscribe({
      next: res => {
        this.authorBusy = false;
        this.authorErrors = res.errors;
        const msg = this.translate.instant('admin.author.result', { added: res.added, errors: res.errors.length });
        if (res.errors.length > 0) this.snackbar.warn(msg); else this.snackbar.quick(msg);
        if (res.added > 0) {
          this.authorChapter = '';
          this.authorFens = '';
        }
      },
      error: err => {
        this.authorBusy = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }
}
