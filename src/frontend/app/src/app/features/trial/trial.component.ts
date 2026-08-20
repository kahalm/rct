import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CalculationService, CalcBook } from '../courses/calc/calculation.service';
import { GuidelinesDialogComponent, GuidelinesDialogData } from './guidelines-dialog.component';

/** Feste Buch-Id des Trial-Kalkulationsbuchs (vom RctSeeder als erstes Buch angelegt). */
export const TRIAL_BOOK_ID = 1;
/** Breakdown-Video zum Trial (Review-Schritt der Guidelines). */
export const TRIAL_VIDEO_URL = 'https://www.youtube.com/watch?v=EgDwm7AOLTg';
/** Produktseite des vollen Programms (Next Level Chess). */
export const PRODUCT_URL = 'https://nextlevelchess.kit.com/products/real-chess-training';
/** Gesetzt, sobald die Guidelines einmal gezeigt wurden — danach startet das Trial direkt. */
const GUIDELINES_SEEN_KEY = 'rct_trial_guidelines_seen';

/**
 * Die Startseite: zwei Wege — das volle Programm (externe Produktseite) oder das Trial hier.
 * Die „Real Chess Training Guidelines" liegen im Dialog (GuidelinesDialogComponent): sie
 * erscheinen EINMALIG vor dem ersten Trainer-Start (localStorage) und sind danach über den
 * Link hier bzw. den ?-Knopf im Trainer wieder erreichbar.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trial',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './trial.component.html',
  styleUrls: ['./trial.component.scss'],
})
export class TrialComponent implements OnInit, OnDestroy {
  readonly bookId = TRIAL_BOOK_ID;
  readonly productUrl = PRODUCT_URL;

  book: CalcBook | null = null;
  loading = true;
  loadError = false;

  private subs = new Subscription();

  constructor(
    private calc: CalculationService,
    private dialog: MatDialog,
    private router: Router,
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

  /** Trial starten — beim ALLERERSTEN Mal erst die Guidelines als Popup (einmalig). */
  startTrial(): void {
    this.launchTrainer({});
  }

  /** Freigeschaltete: direkt ins NEUESTE Kapitel (letztes der sichtbaren Kapitelliste —
   *  Kapitel entstehen chronologisch; der Trainer versteht ?chapter= nachsichtig). */
  startTraining(): void {
    const newest = this.newestChapter;
    this.launchTrainer(newest ? { chapter: newest } : {});
  }

  private get newestChapter(): string | null {
    const named = (this.book?.chapters ?? []).filter(c => !!c.chapter);
    return named.length ? named[named.length - 1].chapter : null;
  }

  private launchTrainer(queryParams: Record<string, string>): void {
    let seen = false;
    try { seen = localStorage.getItem(GUIDELINES_SEEN_KEY) === '1'; } catch {}
    if (seen) {
      this.router.navigate(['/courses', this.bookId, 'calc'], { queryParams });
      return;
    }
    const ref = this.dialog.open<GuidelinesDialogComponent, GuidelinesDialogData, string>(
      GuidelinesDialogComponent, { data: { mode: 'start' }, maxWidth: '720px', autoFocus: false });
    this.subs.add(ref.afterClosed().subscribe(result => {
      // „Gezeigt" gilt unabhängig vom Knopf — einmalig heißt einmalig.
      try { localStorage.setItem(GUIDELINES_SEEN_KEY, '1'); } catch {}
      if (result === 'start') this.router.navigate(['/courses', this.bookId, 'calc'], { queryParams });
    }));
  }

  /** Guidelines jederzeit nachlesen (Link unter den Knöpfen). */
  showGuidelines(): void {
    this.dialog.open<GuidelinesDialogComponent, GuidelinesDialogData>(
      GuidelinesDialogComponent, { data: { mode: 'info' }, maxWidth: '720px', autoFocus: false });
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

  get points(): number { return this.book?.points ?? 0; }
  get maxPoints(): number { return this.book?.maxPoints ?? 0; }
}
