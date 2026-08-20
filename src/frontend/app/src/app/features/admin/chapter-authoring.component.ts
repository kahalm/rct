import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
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

/** ISO-UTC → Wert fuer <input type="datetime-local"> (lokale Zeit, Minutenaufloesung). */
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local (lokale Zeit) → ISO-UTC; leer → null (nicht terminiert). */
function localToIso(local: string): string | null {
  if (!local || !local.trim()) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

interface ChapterRow {
  chapter: string;
  positions: number;
  releaseAtLocal: string;
  testerReleaseAtLocal: string;
  videoUrl: string;
}

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
          <!-- Freischalt-Termine (optional; lokale Zeit, wird als UTC gespeichert):
               leer + leer = sofort fuer alle Freigeschalteten sichtbar. -->
          <div class="release-row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ 'admin.author.releaseAt' | translate }}</mat-label>
              <input matInput type="datetime-local" [(ngModel)]="releaseAtLocal" [disabled]="authorBusy">
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ 'admin.author.testerReleaseAt' | translate }}</mat-label>
              <input matInput type="datetime-local" [(ngModel)]="testerReleaseAtLocal" [disabled]="authorBusy">
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'admin.author.videoUrl' | translate }}</mat-label>
            <input matInput type="url" [(ngModel)]="videoUrlNew" maxlength="500" [disabled]="authorBusy"
                   placeholder="https://www.youtube.com/watch?v=…">
          </mat-form-field>
          <p class="hint">{{ 'admin.author.releaseHint' | translate }}</p>
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

      <!-- ===== Bestehende Kapitel: Umfang + Freischalt-Termine je Kapitel aendern ===== -->
      <mat-card class="chapters-card">
        <mat-card-header>
          <mat-card-title>{{ 'admin.author.chaptersTitle' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (chaptersLoading) {
            <p class="muted">{{ 'common.loading' | translate }}</p>
          } @else {
            <div class="chapters-table-wrap">
              <table class="chapters-table">
                <thead>
                  <tr>
                    <th>{{ 'admin.author.colChapter' | translate }}</th>
                    <th>{{ 'admin.author.colPositions' | translate }}</th>
                    <th>{{ 'admin.author.releaseAt' | translate }}</th>
                    <th>{{ 'admin.author.testerReleaseAt' | translate }}</th>
                    <th>{{ 'admin.author.videoUrl' | translate }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of chapters; track c.chapter) {
                    <tr>
                      <td>{{ c.chapter }}</td>
                      <td>{{ c.positions }}</td>
                      <td><input class="dt" type="datetime-local" [(ngModel)]="c.releaseAtLocal" [disabled]="savingChapter === c.chapter"></td>
                      <td><input class="dt" type="datetime-local" [(ngModel)]="c.testerReleaseAtLocal" [disabled]="savingChapter === c.chapter"></td>
                      <td><input class="dt video-input" type="url" [(ngModel)]="c.videoUrl" maxlength="500"
                                 placeholder="https://…" [disabled]="savingChapter === c.chapter"></td>
                      <td>
                        <button mat-stroked-button (click)="saveRelease(c)" [disabled]="savingChapter === c.chapter">
                          {{ 'common.save' | translate }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="muted">{{ 'admin.author.noChapters' | translate }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="hint">{{ 'admin.author.tableHint' | translate }}</p>
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
    .release-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .release-row mat-form-field { flex: 1 1 220px; }
    .chapters-card { margin-top: 1.25rem; }
    .chapters-table-wrap { overflow-x: auto; }
    .chapters-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    .chapters-table th { text-align: left; font-weight: 500; opacity: 0.7; padding: 8px 10px; border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
    .chapters-table td { padding: 8px 10px; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); }
    .video-input { min-width: 180px; }
    .dt { background: transparent; color: inherit; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 6px; padding: 6px 8px; font: inherit; color-scheme: inherit; }
    .muted { opacity: 0.7; }
    .author-errors {
      margin: 4px 0 0; padding-left: 20px; font-size: 0.85rem; color: #e57373;
      li { margin-bottom: 4px; }
      code { opacity: 0.8; word-break: break-all; }
    }
  `]
})
export class ChapterAuthoringComponent implements OnInit {
  authorChapter = '';
  authorFens = '';
  authorBusy = false;
  authorErrors: { lineNumber: number; reason: string; text?: string }[] = [];
  /** Freischalt-Termine fuers NEUE Kapitel (datetime-local, lokale Zeit; leer = sofort). */
  releaseAtLocal = '';
  testerReleaseAtLocal = '';
  videoUrlNew = '';

  chapters: ChapterRow[] = [];
  chaptersLoading = true;
  savingChapter: string | null = null;

  constructor(
    private http: HttpClient,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadChapters();
  }

  private loadChapters(): void {
    this.chaptersLoading = true;
    this.http.get<{ chapter: string; positions: number; releaseAt: string | null; testerReleaseAt: string | null; videoUrl: string | null }[]>(
      `/api/calculations/books/${TRIAL_BOOK_ID}/chapters`).subscribe({
      next: rows => {
        this.chapters = rows.map(r => ({
          chapter: r.chapter,
          positions: r.positions,
          releaseAtLocal: isoToLocal(r.releaseAt),
          testerReleaseAtLocal: isoToLocal(r.testerReleaseAt),
          videoUrl: r.videoUrl ?? '',
        }));
        this.chaptersLoading = false;
      },
      error: err => {
        this.chaptersLoading = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }

  saveRelease(row: ChapterRow): void {
    this.savingChapter = row.chapter;
    this.http.put(`/api/calculations/books/${TRIAL_BOOK_ID}/chapters/release`, {
      chapter: row.chapter,
      releaseAt: localToIso(row.releaseAtLocal),
      testerReleaseAt: localToIso(row.testerReleaseAtLocal),
      videoUrl: row.videoUrl.trim() || null,
    }).subscribe({
      next: () => {
        this.savingChapter = null;
        this.snackbar.quick(this.translate.instant('admin.author.releaseSaved'));
      },
      error: err => {
        this.savingChapter = null;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }

  addChapter(): void {
    const chapter = this.authorChapter.trim();
    if (!chapter || !this.authorFens.trim() || this.authorBusy) return;
    this.authorBusy = true;
    this.authorErrors = [];
    this.http.post<{ added: number; errors: { lineNumber: number; reason: string; text?: string }[] }>(
      `/api/calculations/books/${TRIAL_BOOK_ID}/chapters`,
      {
        chapter, fenList: this.authorFens,
        releaseAt: localToIso(this.releaseAtLocal),
        testerReleaseAt: localToIso(this.testerReleaseAtLocal),
        videoUrl: this.videoUrlNew.trim() || null,
      },
    ).subscribe({
      next: res => {
        this.authorBusy = false;
        this.authorErrors = res.errors;
        const msg = this.translate.instant('admin.author.result', { added: res.added, errors: res.errors.length });
        if (res.errors.length > 0) this.snackbar.warn(msg); else this.snackbar.quick(msg);
        if (res.added > 0) {
          this.authorChapter = '';
          this.authorFens = '';
          this.releaseAtLocal = '';
          this.testerReleaseAtLocal = '';
          this.videoUrlNew = '';
          this.loadChapters();
        }
      },
      error: err => {
        this.authorBusy = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }
}
