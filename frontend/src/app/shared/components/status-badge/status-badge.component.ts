import { Component, Input } from '@angular/core';
import { IssueStatus } from '../../models/issue.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="status.toLowerCase()">{{ status }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 26px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 750;
        line-height: 1;
        padding: 0 10px;
        white-space: nowrap;
      }

      .new {
        background: #e8f1fb;
        color: #235987;
      }

      .triaged,
      .in_progress {
        background: #eef0ff;
        color: #45428c;
      }

      .waiting_customer {
        background: #fff5db;
        color: #8a5b00;
      }

      .resolved,
      .closed {
        background: #e7f6ee;
        color: #25724b;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: IssueStatus;
}
