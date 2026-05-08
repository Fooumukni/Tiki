import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading-state">
      <mat-spinner diameter="36" />
      <span>{{ label }}</span>
    </div>
  `,
  styles: [
    `
      .loading-state {
        display: grid;
        min-height: 180px;
        place-items: center;
        gap: 12px;
        color: #596579;
        font-weight: 600;
      }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() label = 'Loading';
}
