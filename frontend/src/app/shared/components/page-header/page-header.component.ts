import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div>
        @if (eyebrow) {
          <p class="eyebrow">{{ eyebrow }}</p>
        }
        <h1>{{ title }}</h1>
        @if (description) {
          <p class="description">{{ description }}</p>
        }
      </div>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        gap: 20px;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .eyebrow {
        margin: 0 0 6px;
        color: #2f5f98;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #111827;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: 0;
      }

      .description {
        max-width: 720px;
        margin: 10px 0 0;
        color: #596579;
        font-size: 15px;
        line-height: 1.55;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }

      @media (max-width: 760px) {
        .page-header {
          align-items: stretch;
          flex-direction: column;
        }

        .actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() eyebrow = '';
  @Input() description = '';
}
