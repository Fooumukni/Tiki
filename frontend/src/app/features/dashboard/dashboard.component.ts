import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AccountService } from '../../core/auth/account.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { IssueTableComponent } from '../../shared/components/issue-table/issue-table.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { OrganizationSelectorComponent } from '../../shared/components/organization-selector/organization-selector.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MembershipSummary } from '../../shared/models/auth.model';
import { Issue } from '../../shared/models/issue.model';
import { resolveApiErrorMessage } from '../../shared/utils/api-error-message';
import { IssuesService } from '../issues/services/issues.service';
import { OrganizationContextService } from '../organizations/services/organization-context.service';

interface DashboardMetrics {
  totalIssues: number;
  newIssues: number;
  criticalIssues: number;
  resolvedIssues: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    MetricCardComponent,
    IssueTableComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    OrganizationSelectorComponent,
  ],
  template: `
    <main class="page-shell">
      <app-page-header
        eyebrow="Workspace console"
        title="Dashboard"
        description="Track intake volume, urgent work, and the latest support requests."
      >
        <app-organization-selector
          [memberships]="memberships"
          [selectedOrganizationId]="organizationId"
          (organizationChange)="changeOrganization($event)"
        />
        @if (organizationId) {
          <a mat-flat-button [routerLink]="['/organizations', organizationId, 'issues', 'new']">
            <mat-icon>add</mat-icon>
            New issue
          </a>
        }
      </app-page-header>

      @if (loading) {
        <app-loading-state label="Loading dashboard" />
      } @else if (errorMessage) {
        <app-error-state [message]="errorMessage" />
      } @else if (!organizationId) {
        <app-empty-state
          icon="business"
          title="Create your first organization"
          message="Organizations are required before you can collect and triage issues."
        >
          <a mat-flat-button routerLink="/organizations/new">Create organization</a>
        </app-empty-state>
      } @else {
        <section class="metrics-grid">
          <app-metric-card label="Total issues" [value]="metrics.totalIssues" icon="confirmation_number" />
          <app-metric-card label="New issues" [value]="metrics.newIssues" icon="fiber_new" tone="warning" />
          <app-metric-card label="Critical issues" [value]="metrics.criticalIssues" icon="priority_high" tone="danger" />
          <app-metric-card label="Resolved issues" [value]="metrics.resolvedIssues" icon="task_alt" tone="success" />
        </section>

        <section class="latest-section">
          <div class="section-heading">
            <div>
              <h2 class="section-title">Latest issues</h2>
              <p class="muted-text">Most recent support requests for the selected organization.</p>
            </div>
            <a mat-stroked-button [routerLink]="['/organizations', organizationId, 'issues']">
              View all
              <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>

          @if (latestIssues.length === 0) {
            <app-empty-state title="No issues yet" message="Create the first issue or share your public intake link." />
          } @else {
            <app-issue-table
              [issues]="latestIssues"
              [showPaginator]="false"
              (viewIssue)="openIssue($event)"
            />
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }

      .latest-section {
        display: grid;
        gap: 14px;
      }

      .section-heading {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
      }

      .section-heading p {
        margin: 6px 0 0;
      }

      @media (max-width: 980px) {
        .metrics-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .section-heading {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly issuesService = inject(IssuesService);
  private readonly organizationContextService = inject(OrganizationContextService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  memberships: MembershipSummary[] = [];
  organizationId: string | null = null;
  latestIssues: Issue[] = [];
  metrics: DashboardMetrics = {
    totalIssues: 0,
    newIssues: 0,
    criticalIssues: 0,
    resolvedIssues: 0,
  };
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.accountService
      .getCurrentUser(true)
      .pipe(take(1))
      .subscribe({
        next: (currentUser) => {
          this.memberships = currentUser.memberships;
          this.organizationId = this.organizationContextService.getSelectedOrganizationId(currentUser.memberships);

          if (!this.organizationId) {
            this.loading = false;
            this.changeDetectorRef.detectChanges();
            void this.router.navigate(['/organizations/new']);
            return;
          }

          this.loadDashboard(this.organizationId);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Dashboard could not be loaded.');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  changeOrganization(organizationId: string): void {
    if (organizationId === this.organizationId) {
      return;
    }

    this.organizationContextService.setSelectedOrganizationId(organizationId);
    this.organizationId = organizationId;
    this.loadDashboard(organizationId);
  }

  openIssue(issueId: string): void {
    if (!this.organizationId) {
      return;
    }

    void this.router.navigate(['/organizations', this.organizationId, 'issues', issueId]);
  }

  private loadDashboard(organizationId: string): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      totalIssues: this.issuesService.getIssueCount(organizationId),
      newIssues: this.issuesService.getIssueCount(organizationId, { status: 'NEW' }),
      criticalIssues: this.issuesService.getIssueCount(organizationId, { priority: 'CRITICAL' }),
      resolvedIssues: this.issuesService.getIssueCount(organizationId, { status: 'RESOLVED' }),
      latestIssuesResponse: this.issuesService.listIssues(organizationId, { page: 1, limit: 5 }),
    })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (dashboardData) => {
          this.metrics = {
            totalIssues: dashboardData.totalIssues,
            newIssues: dashboardData.newIssues,
            criticalIssues: dashboardData.criticalIssues,
            resolvedIssues: dashboardData.resolvedIssues,
          };
          this.latestIssues = dashboardData.latestIssuesResponse.items;
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Dashboard metrics could not be loaded.');
          this.changeDetectorRef.detectChanges();
        },
      });
  }
}
