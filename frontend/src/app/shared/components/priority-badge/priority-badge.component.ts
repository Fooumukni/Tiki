import { Component, Input } from '@angular/core';
import { IssuePriority } from '../../models/issue.model';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  template: `<span class="badge" [class]="priority.toLowerCase()">{{ priority }}</span>`,
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

      .low {
        background: #eef3f8;
        color: #526173;
      }

      .medium {
        background: #fff5db;
        color: #8a5b00;
      }

      .high {
        background: #ffe9dc;
        color: #9a4213;
      }

      .critical {
        background: #fde8e8;
        color: #9f2525;
      }
    `,
  ],
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: IssuePriority;
}
