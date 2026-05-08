import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="empty-state">
      <mat-icon>{{ icon }}</mat-icon>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <ng-content />
    </section>
  `,
  styles: [
    `
      .empty-state {
        display: grid;
        place-items: center;
        gap: 10px;
        border: 1px dashed #c8d3e1;
        border-radius: 8px;
        background: #fbfcfe;
        padding: 36px 20px;
        text-align: center;
      }

      mat-icon {
        color: #5b7291;
      }

      h2 {
        margin: 0;
        color: #172033;
        font-size: 20px;
        letter-spacing: 0;
      }

      p {
        max-width: 520px;
        margin: 0;
        color: #647084;
        line-height: 1.55;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
}
