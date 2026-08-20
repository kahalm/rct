import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface GuidelinesDialogData {
  /** 'start' = Zwischenschritt vor dem ersten Trainer-Start (Primärknopf „Start the trial",
   *  Ergebnis 'start'); 'info' = Nachschlagen über den ?-Knopf im Trainer (nur „Close"). */
  mode: 'start' | 'info';
}

/**
 * Die „Real Chess Training Guidelines" als Dialog — vorher der Inhalt der Startseite.
 * Erscheint einmalig vor dem ersten Trainer-Start (localStorage-Flag setzt die Trial-Seite)
 * und jederzeit über den ?-Knopf in der Befehlszeile des Trainers.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-guidelines-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'trial.title' | translate }}</h2>
    <mat-dialog-content>
      <p class="goal">{{ 'trial.goal' | translate }}</p>

      <h3 class="sec"><mat-icon>timer</mat-icon> {{ 'trial.process.title' | translate }}</h3>
      <ul class="rules">
        <li><strong>{{ 'trial.process.timerHead' | translate }}</strong> {{ 'trial.process.timer' | translate }}</li>
        <li><strong>{{ 'trial.process.manageHead' | translate }}</strong> {{ 'trial.process.manage' | translate }}</li>
        <li><strong>{{ 'trial.process.commitHead' | translate }}</strong> {{ 'trial.process.commit' | translate }}</li>
        <li><strong>{{ 'trial.process.stopHead' | translate }}</strong> {{ 'trial.process.stop' | translate }}</li>
        <li><strong>{{ 'trial.process.reviewHead' | translate }}</strong> {{ 'trial.process.review' | translate }}</li>
      </ul>

      <h3 class="sec"><mat-icon>psychology</mat-icon> {{ 'trial.mindset.title' | translate }}</h3>
      <ul class="rules">
        <li><strong>{{ 'trial.mindset.struggleHead' | translate }}</strong> {{ 'trial.mindset.struggle' | translate }}</li>
        <li><strong>{{ 'trial.mindset.wallHead' | translate }}</strong> {{ 'trial.mindset.wall' | translate }}</li>
        <li><strong>{{ 'trial.mindset.processHead' | translate }}</strong> {{ 'trial.mindset.process' | translate }}</li>
        <li><strong>{{ 'trial.mindset.goodEnoughHead' | translate }}</strong> {{ 'trial.mindset.goodEnough' | translate }}</li>
      </ul>

      <p class="golden"><mat-icon>star</mat-icon> <span><strong>{{ 'trial.goldenHead' | translate }}</strong> {{ 'trial.golden' | translate }}</span></p>

      <h3 class="sec"><mat-icon>trending_up</mat-icon> {{ 'trial.benefits.title' | translate }}</h3>
      <ul class="benefits">
        <li>{{ 'trial.benefits.confidence' | translate }}</li>
        <li>{{ 'trial.benefits.time' | translate }}</li>
        <li>{{ 'trial.benefits.tactics' | translate }}</li>
        <li>{{ 'trial.benefits.keyMoments' | translate }}</li>
        <li>{{ 'trial.benefits.easier' | translate }}</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.mode === 'start') {
        <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
        <button mat-raised-button color="primary" [mat-dialog-close]="'start'">
          <mat-icon>play_arrow</mat-icon> {{ 'trial.start' | translate }}
        </button>
      } @else {
        <button mat-raised-button color="primary" mat-dialog-close>{{ 'common.close' | translate }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-width: 640px; }
    .goal { margin: 0 0 0.5rem; font-weight: 500; }
    .sec { display: flex; align-items: center; gap: 8px; margin: 1rem 0 0.4rem; font-size: 1.02rem; }
    .rules, .benefits { margin: 0; padding-left: 1.4rem; }
    .rules li, .benefits li { margin-bottom: 0.3rem; }
    .golden { display: flex; align-items: flex-start; gap: 8px; margin: 1rem 0 0; }
    .golden mat-icon { color: #f5a623; flex: none; }
  `]
})
export class GuidelinesDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: GuidelinesDialogData,
    public ref: MatDialogRef<GuidelinesDialogComponent>) {}
}
