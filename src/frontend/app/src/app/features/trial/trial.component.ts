import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { SnackbarService } from '../../core/snackbar.service';
import { CalculationService, CalcBook } from '../courses/calc/calculation.service';

/** Feste Buch-Id des Trial-Kalkulationsbuchs (vom RctSeeder als erstes Buch angelegt). */
export const TRIAL_BOOK_ID = 1;
/** Breakdown-Video zum Trial (Review-Schritt der Guidelines). */
export const TRIAL_VIDEO_URL = 'https://www.youtube.com/watch?v=EgDwm7AOLTg';

/**
 * Die Trial-Seite — das eine Feature von RCT: erklärt die „Real Chess Training Guidelines"
 * (45-Minuten-Test über sechs Stellungen), startet den Kalkulations-Trainer und führt nach dem
 * Durcharbeiten zum Breakdown-Video (Review). Fortschritt/Punkte kommen aus dem Calc-Backend.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './trial.component.html',
  styleUrls: ['./trial.component.scss'],
})
export class TrialComponent implements OnInit, OnDestroy {
  readonly bookId = TRIAL_BOOK_ID;
  readonly videoUrl = TRIAL_VIDEO_URL;

  book: CalcBook | null = null;
  loading = true;
  loadError = false;

  private subs = new Subscription();

  constructor(
    private calc: CalculationService,
    private http: HttpClient,
    public auth: AuthService,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.calc.getBook(this.bookId).subscribe({
      next: book => { this.book = book; this.loading = false; },
      error: () => { this.loading = false; this.loadError = true; },
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** Wie viele der sechs Stellungen schon eine Festlegung tragen (die Golden Rule zählt Festlegungen). */
  get chosenCount(): number {
    return this.book?.positions.filter(p => !!p.chosenSan).length ?? 0;
  }

  get ratedCount(): number {
    return this.book?.positions.filter(p => p.grade !== null && p.grade !== undefined).length ?? 0;
  }

  get positionCount(): number {
    return this.book?.positions.length ?? 0;
  }

  /** Alle Stellungen festgelegt → der Review-Schritt (Video) ist dran. */
  get done(): boolean {
    return this.positionCount > 0 && this.chosenCount >= this.positionCount;
  }

  get points(): number { return this.book?.points ?? 0; }
  get maxPoints(): number { return this.book?.maxPoints ?? 0; }

  // ===== Kapitel-Authoring (nur Admin) ======================================

  authorChapter = '';
  authorFens = '';
  authorBusy = false;

  /** Memo-Format wie RookHub: eine FEN je Zeile, optional „| Kommentar" bzw. „{Kommentar}".
   *  Direkt-POST hier statt eines eigenen Services — es ist der einzige Authoring-Aufruf der App. */
  addChapter(): void {
    const chapter = this.authorChapter.trim();
    if (!chapter || !this.authorFens.trim() || this.authorBusy) return;
    this.authorBusy = true;
    this.http.post<{ added: number; errors: { lineNumber: number; reason: string }[] }>(
      `/api/calculations/books/${this.bookId}/chapters`,
      { chapter, fenList: this.authorFens },
    ).subscribe({
      next: res => {
        this.authorBusy = false;
        const msg = this.translate.instant('trial.author.result', { added: res.added, errors: res.errors.length });
        if (res.errors.length > 0) this.snackbar.warn(msg); else this.snackbar.quick(msg);
        if (res.added > 0) {
          this.authorChapter = '';
          this.authorFens = '';
          this.ngOnInit();   // Buch neu laden (Fortschritt/Kapitel aktualisieren)
        }
      },
      error: (err) => {
        this.authorBusy = false;
        this.snackbar.warn(err?.error?.message || this.translate.instant('common.error'));
      },
    });
  }
}
