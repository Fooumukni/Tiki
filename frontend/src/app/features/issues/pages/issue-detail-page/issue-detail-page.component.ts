import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { AiStatusBadgeComponent } from '../../../../shared/components/ai-status-badge/ai-status-badge.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { Issue, IssueStatus } from '../../../../shared/models/issue.model';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-issue-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    AiStatusBadgeComponent,
  ],
  template: `
    <main class="page-shell">
      <app-page-header
        eyebrow="Issue detail"
        [title]="issue ? issue.code : 'Issue'"
        [description]="issue ? issue.title : 'Loading issue detail.'"
      >
        <a mat-stroked-button [routerLink]="['/organizations', organizationId, 'issues']">
          <mat-icon>arrow_back</mat-icon>
          Back
        </a>
      </app-page-header>

      @if (errorMessage) {
        <app-error-state [message]="errorMessage" />
      } @else if (loading) {
        <app-loading-state label="Loading issue" />
      } @else if (issue) {
        <section class="detail-grid">
          <article class="content-panel main-panel">
            <div class="panel-heading">
              <h2 class="section-title">Original request</h2>
              <app-status-badge [status]="issue.status" />
            </div>
            <p class="request-copy">{{ issue.originalDescription }}</p>

            <mat-divider />

            <section class="ai-summary">
              <h2 class="section-title">AI triage</h2>
              <div class="ai-grid">
                <div>
                  <span>Generated title</span>
                  <strong>{{ issue.generatedTitle || 'Pending analysis' }}</strong>
                </div>
                <div>
                  <span>Summary</span>
                  <p>{{ issue.summary || 'Pending analysis' }}</p>
                </div>
                <div>
                  <span>Suggested response</span>
                  <p>{{ issue.suggestedResponse || 'Pending analysis' }}</p>
                </div>
              </div>
            </section>

            <mat-divider />

            <section>
              <h2 class="section-title">Message history</h2>
              <div class="messages">
                @for (message of issue.messages ?? []; track message.id) {
                  <div class="message">
                    <div>
                      <strong>{{ message.senderName || message.senderType }}</strong>
                      <span>{{ message.createdAt | date: 'medium' }}</span>
                    </div>
                    <p>{{ message.content }}</p>
                  </div>
                }
              </div>
            </section>
          </article>

          <aside class="content-panel side-panel">
            <section class="status-action">
              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="selectedStatus">
                  @for (option of statusOptions; track option) {
                    <mat-option [value]="option">{{ option }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-flat-button type="button" (click)="updateStatus()" [disabled]="issue.status === selectedStatus">
                Change status
              </button>
            </section>

            <dl>
              <div>
                <dt>Priority</dt>
                <dd><app-priority-badge [priority]="issue.priority" /></dd>
              </div>
              <div>
                <dt>AI status</dt>
                <dd><app-ai-status-badge [status]="issue.aiAnalysisStatus" /></dd>
              </div>
              <div><dt>Sentiment</dt><dd>{{ issue.sentiment || 'Pending' }}</dd></div>
              <div><dt>Category</dt><dd>{{ issue.category || 'Pending' }}</dd></div>
              <div><dt>Suggested team</dt><dd>{{ issue.suggestedTeam || 'Pending' }}</dd></div>
              <div><dt>Source</dt><dd>{{ issue.sourceChannel }}</dd></div>
              <div><dt>Requester</dt><dd>{{ issue.requester?.name || 'Unknown' }}</dd></div>
              <div><dt>Created</dt><dd>{{ issue.createdAt | date: 'medium' }}</dd></div>
            </dl>

            <button mat-stroked-button type="button" (click)="retryAiAnalysis()" [disabled]="retrying">
              <mat-icon>auto_awesome</mat-icon>
              {{ retrying ? 'Retrying' : 'Retry AI analysis' }}
            </button>
          </aside>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
      }

      .main-panel,
      .side-panel {
        padding: 22px;
      }

      .main-panel {
        display: grid;
        gap: 22px;
      }

      .panel-heading {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }

      .request-copy,
      .ai-grid p,
      .message p {
        margin: 0;
        color: #3f4b5f;
        line-height: 1.65;
      }

      .ai-grid {
        display: grid;
        gap: 16px;
        margin-top: 14px;
      }

      .ai-grid span {
        display: block;
        margin-bottom: 6px;
        color: #647084;
        font-size: 12px;
        font-weight: 750;
      }

      .ai-grid strong {
        color: #111827;
      }

      .messages {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }

      .message {
        border: 1px solid #edf1f6;
        border-radius: 8px;
        padding: 14px;
      }

      .message div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .message span {
        color: #647084;
        font-size: 12px;
      }

      .side-panel {
        display: grid;
        align-content: start;
        gap: 18px;
      }

      .status-action {
        display: grid;
        gap: 10px;
      }

      dl {
        display: grid;
        gap: 12px;
        margin: 0;
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      dt {
        color: #647084;
        font-weight: 700;
      }

      dd {
        margin: 0;
        color: #172033;
        font-weight: 750;
        overflow-wrap: anywhere;
        text-align: right;
      }

      @media (max-width: 980px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class IssueDetailPageComponent implements OnInit, OnDestroy {
  private readonly issuesService = inject(IssuesService);
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pollingIntervalMs = 3000;
  private readonly maxPollingAttempts = 20;
  private readonly loadTimeoutMs = 8000;

  readonly statusOptions: IssueStatus[] = ['NEW', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
  readonly organizationId = this.route.snapshot.paramMap.get('organizationId') ?? '';
  readonly issueId = this.route.snapshot.paramMap.get('issueId') ?? '';

  issue: Issue | null = null;
  selectedStatus: IssueStatus = 'NEW';
  loading = true;
  retrying = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadIssue();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  updateStatus(): void {
    if (!this.issue || this.issue.status === this.selectedStatus) {
      return;
    }

    this.issuesService.updateIssueStatus(this.organizationId, this.issue.id, { status: this.selectedStatus }).subscribe({
      next: (issue) => {
        this.issue = issue;
        this.selectedStatus = issue.status;
        this.changeDetectorRef.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = resolveApiErrorMessage(error, 'Issue status could not be updated.');
        this.selectedStatus = this.issue?.status ?? 'NEW';
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  retryAiAnalysis(): void {
    if (!this.issue) {
      return;
    }

    this.retrying = true;
    this.issuesService
      .retryAiAnalysis(this.organizationId, this.issue.id)
      .pipe(
        take(1),
        finalize(() => {
          this.retrying = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (issue) => {
          this.issue = issue;
          this.changeDetectorRef.detectChanges();
          this.startPollingForAiResult();
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'AI analysis retry could not be queued.');
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  private loadIssue(): void {
    if (!this.organizationId || !this.issueId) {
      this.loading = false;
      this.errorMessage = 'Issue route is invalid.';
      this.changeDetectorRef.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const loadingTimeout = window.setTimeout(() => {
      if (!this.loading) {
        return;
      }

      this.loading = false;
      this.errorMessage = 'Issue took too long to load. Please go back and open it again.';
      this.changeDetectorRef.detectChanges();
    }, this.loadTimeoutMs);

    this.issuesService
      .getIssue(this.organizationId, this.issueId)
      .pipe(
        take(1),
        finalize(() => {
          window.clearTimeout(loadingTimeout);
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (issue) => {
          this.issue = issue;
          this.selectedStatus = issue.status;
          this.changeDetectorRef.detectChanges();

          if (issue.aiAnalysisStatus === 'PENDING' || issue.aiAnalysisStatus === 'PROCESSING') {
            this.startPollingForAiResult();
          }
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Issue could not be loaded.');
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  private startPollingForAiResult(): void {
    this.stopPolling();

    let attempts = 0;
    this.pollingTimer = setInterval(() => {
      attempts++;

      if (attempts > this.maxPollingAttempts) {
        this.stopPolling();
        return;
      }

      this.issuesService
        .getIssue(this.organizationId, this.issueId)
        .pipe(take(1))
        .subscribe({
          next: (issue) => {
            this.issue = issue;
            this.selectedStatus = issue.status;
            this.changeDetectorRef.detectChanges();

            if (issue.aiAnalysisStatus !== 'PENDING' && issue.aiAnalysisStatus !== 'PROCESSING') {
              this.stopPolling();
            }
          },
        });
    }, this.pollingIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
