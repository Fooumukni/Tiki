import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="error-state" role="alert">
      <mat-icon>error</mat-icon>
      <span>{{ message }}</span>
    </section>
  `,
  styles: [
    `
      .error-state {
        display: flex;
        gap: 10px;
        align-items: center;
        border: 1px solid #f2b8b5;
        border-radius: 8px;
        background: #fff5f5;
        color: #8a1f17;
        padding: 14px 16px;
      }
    `,
  ],
})
export class ErrorStateComponent {
  @Input({ required: true }) message!: string;
}
