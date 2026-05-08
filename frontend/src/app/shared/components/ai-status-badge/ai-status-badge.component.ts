import { Component, Input } from '@angular/core';
import { AiAnalysisStatus } from '../../models/issue.model';

@Component({
  selector: 'app-ai-status-badge',
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

      .pending {
        background: #eef3f8;
        color: #526173;
      }

      .processing {
        background: #e8f1fb;
        color: #235987;
      }

      .completed {
        background: #e7f6ee;
        color: #25724b;
      }

      .failed {
        background: #fde8e8;
        color: #9f2525;
      }
    `,
  ],
})
export class AiStatusBadgeComponent {
  @Input({ required: true }) status!: AiAnalysisStatus;
}
