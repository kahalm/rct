import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '../../core/snackbar.service';
import { extractHttpErrorMessage } from '../../core/http-error';
import { TRIAL_BOOK_ID } from '../trial/trial.component';

/** Abstand zwischen zwei Trainings — Vorschlag fuer die Termine des naechsten Kapitels. */
const RELEASE_STEP_DAYS = 7;
/** Uhrzeit des Vorschlags, wenn es noch KEINEN Termin gibt, von dem man erben koennte. */
const FALLBACK_TIME = { hours: 5, minutes: 50 };

/** ISO-UTC → Wert fuer <input type="datetime-local"> (lokale Zeit, Minutenaufloesung). */
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : dateToLocal(d);
}

/** Date → Wert fuer <input type="datetime-local"> (lokale Zeit, Minutenaufloesung). */
function dateToLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local (lokale Zeit) → ISO-UTC; leer → null (nicht terminiert). */
function localToIso(local: string): string | null {
  if (!local || !local.trim()) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function addDays(local: string, days: number): string {
  const d = new Date(local);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return dateToLocal(d);
}

/** Kapitelname aus einem Termin: „21.09.2026" — die Schreibweise der bestehenden Kapitel. */
function dateName(local: string): string {
  const d = new Date(local);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

interface ChapterRow {
  chapter: string;
  positions: number;
  releaseAtLocal: string;
  testerReleaseAtLocal: string;
  videoUrl: string;
}

interface ChapterPosition {
  id: number;
  round: string;
  fen: string;
  comment: string | null;
  trees: number;
}

/**
 * Kapitel-Authoring (nur Admin): FEN-Memo im RookHub-Format als neues Kapitel anlegen ODER ein
 * bestehendes BEARBEITEN (Bearbeiten-Knopf in der Tabelle holt Name, Stellungen, Termine und
 * Video zurück in die Maske). Beim Bearbeiten ersetzt die Liste den Kapitelinhalt: unveränderte
 * FENs behalten ihre gespeicherten Analysen, entfernte verlieren sie — darum muss dort JEDE
 * Zeile gültig sein (sonst speichert der Server nichts).
 * Die Termine des NEUEN Kapitels sind vorbelegt: letzter Termin + 7 Tage, Name = dieses Datum.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-chapter-authoring',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  template: `
    <div class="author-container">
      <h1>{{ 'admin.author.pageTitle' | translate }}</h1>
      <mat-card class="author-card" [class.author-card--editing]="editingChapter">
        <mat-card-header>
          <mat-card-title>
            {{ editingChapter
                ? ('admin.author.editTitle' | translate: { chapter: editingChapter })
                : ('admin.author.newTitle' | translate) }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content class="author-form">
          <p class="hint">{{ (editingChapter ? 'admin.author.editHint' : 'admin.author.hint') | translate }}</p>
          @if (editingChapter && editingTrees > 0) {
            <p class="warn"><mat-icon>warning</mat-icon>
              {{ 'admin.author.editTrees' | translate: { trees: editingTrees } }}</p>
          }
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
          <div class="author-actions">
            <button mat-raised-button color="primary" (click)="save()"
                    [disabled]="authorBusy || !authorChapter.trim() || !authorFens.trim()">
              <mat-icon>{{ editingChapter ? 'save' : 'playlist_add' }}</mat-icon>
              {{ (editingChapter ? 'admin.author.update' : 'admin.author.add') | translate }}
            </button>
            @if (editingChapter) {
              <button mat-button (click)="cancelEdit()" [disabled]="authorBusy">
                {{ 'common.cancel' | translate }}
              </button>
            }
          </div>
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

      <!-- ===== Bestehende Kapitel: neueste zuerst; Termine/Video aendern oder bearbeiten ===== -->
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
                  @for (c of chaptersDesc; track c.chapter) {
                    <tr [class.row--editing]="editingChapter === c.chapter">
                      <td>{{ c.chapter }}</td>
                      <td>{{ c.positions }}</td>
                      <td><input class="dt" type="datetime-local" [(ngModel)]="c.releaseAtLocal" [disabled]="savingChapter === c.chapter"></td>
                      <td><input class="dt" type="datetime-local" [(ngModel)]="c.testerReleaseAtLocal" [disabled]="savingChapter === c.chapter"></td>
                      <td><input class="dt video-input" type="url" [(ngModel)]="c.videoUrl" maxlength="500"
                                 placeholder="https://…" [disabled]="savingChapter === c.chapter"></td>
                      <td class="row-actions">
                        <button mat-stroked-button (click)="saveRelease(c)" [disabled]="savingChapter === c.chapter">
                          {{ 'common.save' | translate }}
                        </button>
                        <button mat-icon-button (click)="editChapter(c)" [disabled]="authorBusy"
                                [matTooltip]="'admin.author.edit' | translate"
                                [attr.aria-label]="'admin.author.edit' | translate">
                          <mat-icon>edit</mat-icon>
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
    .author-container { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    h1 { font-size: 1.4rem; margin: 0 0 1rem; }
    .author-card { max-width: 760px; }
    .author-card--editing { border-left: 3px solid #f5a623; }
    .author-form { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; }
    .hint { margin: 0; opacity: 0.75; font-size: 0.9rem; }
    .warn {
      display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 0.9rem; color: #f5a623;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    mat-form-field { width: 100%; }
    .author-actions { display: flex; align-items: center; gap: 8px; }
    .release-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .release-row mat-form-field { flex: 1 1 220px; }
    .chapters-card { margin-top: 1.25rem; }
    .chapters-table-wrap { overflow-x: auto; }
    .chapters-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    .chapters-table th { text-align: left; font-weight: 500; opacity: 0.7; padding: 8px 8px; border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); white-space: nowrap; }
    .chapters-table td { padding: 8px 8px; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); vertical-align: middle; }
    /* Spaltenbreiten: Termine fest-kompakt, Video nimmt den Rest, Name/Zahl/Knopf schmal —
       damit die Zeile auf dem Desktop OHNE horizontales Scrollen auskommt (User-Report). */
    .chapters-table td:nth-child(1) { white-space: nowrap; font-weight: 500; }
    .chapters-table td:nth-child(2) { text-align: center; width: 1%; }
    .chapters-table td:nth-child(3), .chapters-table td:nth-child(4) { width: 178px; }
    .chapters-table td:nth-child(6) { width: 1%; }
    .row-actions { white-space: nowrap; display: flex; align-items: center; gap: 2px; }
    .row--editing { background: color-mix(in srgb, #f5a623 12%, transparent); }
    .video-input { width: 100%; min-width: 140px; box-sizing: border-box; }
    .dt { background: transparent; color: inherit; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 6px; padding: 6px 6px; font: inherit; font-size: 0.88rem; color-scheme: inherit; width: 170px; box-sizing: border-box; }
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
  /** Freischalt-Termine (datetime-local, lokale Zeit; leer = sofort sichtbar). */
  releaseAtLocal = '';
  testerReleaseAtLocal = '';
  videoUrlNew = '';

  /** Gesetzt = die Maske BEARBEITET dieses Kapitel (Name kann dabei geändert werden). */
  editingChapter: string | null = null;
  /** Gespeicherte Analysen im bearbeiteten Kapitel — Warnung vor dem Entfernen von Stellungen. */
  editingTrees = 0;

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

  /** Tabelle: NEUESTE zuerst (User-Wunsch) — der Server liefert die Trainer-Reihenfolge. */
  get chaptersDesc(): ChapterRow[] {
    return [...this.chapters].reverse();
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
        this.prefillNew();
      },
      error: err => {
        this.chaptersLoading = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }

  /**
   * Vorschlag für das NÄCHSTE Kapitel: jeweils letzter Termin + 7 Tage (Uhrzeit wird geerbt),
   * Name = dieses Datum. Gibt es noch keinen Tester-Termin, liegt er eine Woche vor dem
   * Release — das Muster der bestehenden Kapitel. Alles bleibt überschreibbar.
   */
  private prefillNew(): void {
    if (this.editingChapter) return;
    // datetime-local ist lexikografisch sortierbar (YYYY-MM-DDTHH:mm) → max = spätester Termin.
    const latest = (pick: (r: ChapterRow) => string): string =>
      this.chapters.map(pick).filter(v => !!v).sort().pop() ?? '';
    const lastRelease = latest(r => r.releaseAtLocal);
    const lastTester = latest(r => r.testerReleaseAtLocal);

    let release: string;
    if (lastRelease) release = addDays(lastRelease, RELEASE_STEP_DAYS);
    else {
      const d = new Date();
      d.setDate(d.getDate() + RELEASE_STEP_DAYS);
      d.setHours(FALLBACK_TIME.hours, FALLBACK_TIME.minutes, 0, 0);
      release = dateToLocal(d);
    }
    this.releaseAtLocal = release;
    this.testerReleaseAtLocal = lastTester
      ? addDays(lastTester, RELEASE_STEP_DAYS)
      : addDays(release, -RELEASE_STEP_DAYS);
    this.authorChapter = dateName(release);
    this.videoUrlNew = '';
    this.authorFens = '';
    this.authorErrors = [];
  }

  /** Bestehendes Kapitel in die Maske holen (Stellungen als Memo-Text). */
  editChapter(row: ChapterRow): void {
    if (this.authorBusy) return;
    this.authorBusy = true;
    this.http.get<ChapterPosition[]>(
      `/api/calculations/books/${TRIAL_BOOK_ID}/chapters/positions`,
      { params: { chapter: row.chapter } },
    ).subscribe({
      next: rows => {
        this.authorBusy = false;
        this.editingChapter = row.chapter;
        this.editingTrees = rows.reduce((n, p) => n + (p.trees ?? 0), 0);
        this.authorChapter = row.chapter;
        this.authorFens = rows.map(p => (p.comment ? `${p.fen} | ${p.comment}` : p.fen)).join('\n');
        this.releaseAtLocal = row.releaseAtLocal;
        this.testerReleaseAtLocal = row.testerReleaseAtLocal;
        this.videoUrlNew = row.videoUrl;
        this.authorErrors = [];
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ohne DOM egal */ }
      },
      error: err => {
        this.authorBusy = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }

  cancelEdit(): void {
    this.editingChapter = null;
    this.editingTrees = 0;
    this.prefillNew();
  }

  save(): void {
    if (this.editingChapter) this.updateChapter(); else this.addChapter();
  }

  private updateChapter(): void {
    const original = this.editingChapter;
    const chapter = this.authorChapter.trim();
    if (!original || !chapter || !this.authorFens.trim() || this.authorBusy) return;
    this.authorBusy = true;
    this.authorErrors = [];
    this.http.put<{ kept: number; added: number; removed: number }>(
      `/api/calculations/books/${TRIAL_BOOK_ID}/chapters`,
      {
        originalChapter: original,
        chapter,
        fenList: this.authorFens,
        releaseAt: localToIso(this.releaseAtLocal),
        testerReleaseAt: localToIso(this.testerReleaseAtLocal),
        videoUrl: this.videoUrlNew.trim() || null,
      },
    ).subscribe({
      next: res => {
        this.authorBusy = false;
        this.editingChapter = null;
        this.editingTrees = 0;
        this.snackbar.quick(this.translate.instant('admin.author.updated', res));
        this.loadChapters();   // ruft prefillNew() und leert die Maske
      },
      error: err => {
        this.authorBusy = false;
        // 400 mit Zeilenfehlern: der Server hat NICHTS gespeichert — Zeilen hier anzeigen.
        this.authorErrors = err?.error?.errors ?? [];
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

  private addChapter(): void {
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
        // Nachschub in dasselbe Kapitel soll die Zeilen NICHT verlieren, solange etwas schieflief;
        // erst bei fehlerfreiem Anlegen räumt loadChapters()/prefillNew() die Maske.
        if (res.added > 0 && res.errors.length === 0) this.loadChapters();
      },
      error: err => {
        this.authorBusy = false;
        this.snackbar.warn(extractHttpErrorMessage(err, this.translate.instant('common.error')));
      },
    });
  }
}
