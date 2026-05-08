import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AiStatusBadgeComponent } from '../ai-status-badge/ai-status-badge.component';
import { PriorityBadgeComponent } from '../priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { Issue } from '../../models/issue.model';

@Component({
  selector: 'app-issue-table',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    AiStatusBadgeComponent,
  ],
  template: `
    <section class="table-shell">
      <table mat-table [dataSource]="issues">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let issue">
            <button class="code-button" type="button" (click)="viewIssue.emit(issue.id)">{{ issue.code }}</button>
          </td>
        </ng-container>

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Title</th>
          <td mat-cell *matCellDef="let issue">
            <div class="title-cell">
              <strong>{{ issue.title }}</strong>
              <span>{{ issue.requester?.name || 'Unknown requester' }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let issue">
            <app-status-badge [status]="issue.status" />
          </td>
        </ng-container>

        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef>Priority</th>
          <td mat-cell *matCellDef="let issue">
            <app-priority-badge [priority]="issue.priority" />
          </td>
        </ng-container>

        <ng-container matColumnDef="source">
          <th mat-header-cell *matHeaderCellDef>Source</th>
          <td mat-cell *matCellDef="let issue">{{ issue.sourceChannel }}</td>
        </ng-container>

        <ng-container matColumnDef="ai">
          <th mat-header-cell *matHeaderCellDef>AI</th>
          <td mat-cell *matCellDef="let issue">
            <app-ai-status-badge [status]="issue.aiAnalysisStatus" />
          </td>
        </ng-container>

        <ng-container matColumnDef="created">
          <th mat-header-cell *matHeaderCellDef>Created</th>
          <td mat-cell *matCellDef="let issue">{{ issue.createdAt | date: 'mediumDate' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let issue">
            <button mat-icon-button type="button" aria-label="Open issue" (click)="viewIssue.emit(issue.id)">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (showPaginator) {
        <mat-paginator
          [length]="total"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          (page)="pageChange.emit($event)"
        />
      }
    </section>
  `,
  styles: [
    `
      .table-shell {
        overflow: hidden;
        border: 1px solid #d9e1ec;
        border-radius: 8px;
        background: #ffffff;
      }

      table {
        width: 100%;
      }

      th {
        color: #647084;
        font-size: 12px;
        font-weight: 750;
      }

      td {
        color: #172033;
      }

      .title-cell {
        display: grid;
        gap: 4px;
        min-width: 240px;
        padding: 8px 0;
      }

      .title-cell strong {
        color: #111827;
        font-weight: 750;
      }

      .title-cell span {
        color: #647084;
        font-size: 12px;
      }

      .code-button {
        border: 0;
        background: transparent;
        color: #235987;
        cursor: pointer;
        font: inherit;
        font-weight: 750;
        padding: 0;
      }

      mat-paginator {
        border-top: 1px solid #edf1f6;
      }

      @media (max-width: 920px) {
        .table-shell {
          overflow-x: auto;
        }

        table {
          min-width: 920px;
        }
      }
    `,
  ],
})
export class IssueTableComponent {
  @Input({ required: true }) issues: Issue[] = [];
  @Input() total = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 20;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() showPaginator = true;
  @Output() viewIssue = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<PageEvent>();

  readonly displayedColumns = ['code', 'title', 'status', 'priority', 'source', 'ai', 'created', 'actions'];
}
