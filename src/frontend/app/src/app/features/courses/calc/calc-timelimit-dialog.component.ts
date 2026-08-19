import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * RCT-Zusatz (nicht aus RookHub): der 45-Minuten-Hinweis des Trials. Erscheint EINMAL, wenn die
 * aufsummierte aktive Rechenzeit über alle Stellungen das Guidelines-Limit erreicht — bewusst nur
 * ein Hinweis („Hard stop" laut Guidelines ist eine Selbstdisziplin-Regel), KEIN Zwangs-Stopp:
 * der Nutzer darf weiterarbeiten, soll aber laut Regelwerk seine aktuelle Festlegung notieren
 * und aufhören.
 */
@Component({
  selector: 'app-calc-timelimit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title class="tl-title"><mat-icon>alarm</mat-icon> {{ 'calc.timeLimit.title' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ 'calc.timeLimit.body' | translate }}</p>
      <p class="tl-review">{{ 'calc.timeLimit.review' | translate }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>{{ 'calc.timeLimit.ok' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .tl-title { display: flex; align-items: center; gap: 8px; }
    .tl-title mat-icon { color: #f5a623; }
    .tl-review { opacity: 0.75; font-size: 0.92em; }
  `],
})
export class CalcTimelimitDialogComponent {}
