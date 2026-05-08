import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { AccountService } from '../../../../core/auth/account.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IssueTableComponent } from '../../../../shared/components/issue-table/issue-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { OrganizationSelectorComponent } from '../../../../shared/components/organization-selector/organization-selector.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { MembershipSummary } from '../../../../shared/models/auth.model';
import { Issue, IssuePriority, IssueStatus, SourceChannel } from '../../../../shared/models/issue.model';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-issues-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    OrganizationSelectorComponent,
    IssueTableComponent,
  ],
  template: `
    <main class="page-shell">
      <app-page-header
        eyebrow="Queue"
        title="Issues"
        description="Review support issues collected from dashboard, public forms, and Telegram."
      >
        <app-organization-selector
          [memberships]="memberships"
          [selectedOrganizationId]="organizationId"
          (organizationChange)="changeOrganization($event)"
        />
        <a mat-flat-button [routerLink]="['/organizations', organizationId, 'issues', 'new']">
          <mat-icon>add</mat-icon>
          New issue
        </a>
      </app-page-header>

      <section class="content-panel filters">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="search" (keyup.enter)="applyFilters()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="status">
            <mat-option value="">All statuses</mat-option>
            @for (option of statusOptions; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select [(ngModel)]="priority">
            <mat-option value="">All priorities</mat-option>
            @for (option of priorityOptions; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Source</mat-label>
          <mat-select [(ngModel)]="sourceChannel">
            <mat-option value="">All sources</mat-option>
            @for (option of sourceOptions; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button type="button" (click)="applyFilters()">
          <mat-icon>filter_alt</mat-icon>
          Apply
        </button>
      </section>

      @if (errorMessage) {
        <app-error-state [message]="errorMessage" />
      } @else if (loading) {
        <app-loading-state label="Loading issues" />
      } @else if (issues.length === 0) {
        <app-empty-state title="No issues found" message="Create an issue or adjust the current filters." />
      } @else {
        <app-issue-table
          [issues]="issues"
          [total]="total"
          [pageIndex]="page - 1"
          [pageSize]="limit"
          (pageChange)="handlePageChange($event)"
          (viewIssue)="openIssue($event)"
        />
      }
    </main>
  `,
  styles: [
    `
      .filters {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, 180px)) auto;
        gap: 12px;
        align-items: center;
        margin-bottom: 18px;
        padding: 16px;
      }

      @media (max-width: 980px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class IssuesPageComponent implements OnInit {
  private readonly issuesService = inject(IssuesService);
  private readonly accountService = inject(AccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly statusOptions: IssueStatus[] = ['NEW', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
  readonly priorityOptions: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly sourceOptions: SourceChannel[] = ['DASHBOARD', 'PUBLIC_FORM', 'TELEGRAM', 'EMAIL', 'API', 'WHATSAPP'];

  organizationId = '';
  memberships: MembershipSummary[] = [];
  issues: Issue[] = [];
  search = '';
  status: IssueStatus | '' = '';
  priority: IssuePriority | '' = '';
  sourceChannel: SourceChannel | '' = '';
  page = 1;
  limit = 20;
  total = 0;
  loading = true;
  errorMessage = '';
  private readonly loadTimeoutMs = 8000;

  ngOnInit(): void {
    this.organizationId = this.route.snapshot.paramMap.get('organizationId') ?? '';
    this.accountService
      .getCurrentUser(true)
      .pipe(take(1))
      .subscribe({
      next: (currentUser) => {
        this.memberships = currentUser.memberships;
        this.changeDetectorRef.detectChanges();
      },
    });
    this.loadIssues();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadIssues();
  }

  handlePageChange(pageEvent: PageEvent): void {
    this.page = pageEvent.pageIndex + 1;
    this.limit = pageEvent.pageSize;
    this.loadIssues();
  }

  loadIssues(): void {
    this.loading = true;
    this.errorMessage = '';
    const loadingTimeout = window.setTimeout(() => {
      if (!this.loading) {
        return;
      }

      this.loading = false;
      this.errorMessage = 'Issues took too long to load. Please refresh the page.';
      this.changeDetectorRef.detectChanges();
    }, this.loadTimeoutMs);

    this.issuesService
      .listIssues(this.organizationId, {
        search: this.search.trim() || undefined,
        status: this.status || undefined,
        priority: this.priority || undefined,
        sourceChannel: this.sourceChannel || undefined,
        page: this.page,
        limit: this.limit,
      })
      .pipe(
        take(1),
        finalize(() => {
          window.clearTimeout(loadingTimeout);
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.issues = response.items;
          this.total = response.total;
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Issues could not be loaded.');
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  changeOrganization(organizationId: string): void {
    if (organizationId === this.organizationId) {
      return;
    }

    void this.router.navigate(['/organizations', organizationId, 'issues']);
  }

  openIssue(issueId: string): void {
    void this.router.navigate(['/organizations', this.organizationId, 'issues', issueId]);
  }
}
