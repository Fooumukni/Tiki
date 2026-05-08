import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <article class="metric-card">
      <div class="icon-shell" [class]="tone">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div>
        <span>{{ label }}</span>
        <strong>{{ value }}</strong>
      </div>
    </article>
  `,
  styles: [
    `
      .metric-card {
        display: flex;
        gap: 14px;
        align-items: center;
        border: 1px solid #d9e1ec;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 10px 24px rgba(23, 32, 51, 0.05);
        min-height: 104px;
        padding: 18px;
      }

      .icon-shell {
        display: grid;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        place-items: center;
        border-radius: 8px;
        background: #edf4fc;
        color: #235987;
      }

      .neutral {
        background: #edf4fc;
        color: #235987;
      }

      .warning {
        background: #fff5db;
        color: #8a5b00;
      }

      .danger {
        background: #fde8e8;
        color: #9f2525;
      }

      .success {
        background: #e7f6ee;
        color: #25724b;
      }

      span {
        display: block;
        color: #647084;
        font-size: 13px;
        font-weight: 700;
      }

      strong {
        display: block;
        margin-top: 4px;
        color: #111827;
        font-size: 30px;
        font-weight: 750;
        letter-spacing: 0;
        line-height: 1;
      }
    `,
  ],
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number;
  @Input({ required: true }) icon!: string;
  @Input() tone: 'neutral' | 'warning' | 'danger' | 'success' = 'neutral';
}
