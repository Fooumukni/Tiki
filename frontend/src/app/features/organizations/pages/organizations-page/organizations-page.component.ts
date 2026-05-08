import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { Organization } from '../../../../shared/models/organization.model';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { OrganizationContextService } from '../../services/organization-context.service';
import { OrganizationsService } from '../../services/organizations.service';

@Component({
  selector: 'app-organizations-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule, PageHeaderComponent, LoadingStateComponent, ErrorStateComponent],
  template: `
    <main class="page-shell">
      <app-page-header
        eyebrow="Workspaces"
        title="Organizations"
        description="Manage the workspaces where support issues are collected and triaged."
      >
        <a mat-flat-button routerLink="/organizations/new">
          <mat-icon>add</mat-icon>
          New organization
        </a>
      </app-page-header>

      @if (loading) {
        <app-loading-state label="Loading organizations" />
      } @else if (errorMessage) {
        <app-error-state [message]="errorMessage" />
      } @else {
        <section class="organization-grid">
          @for (organization of organizations; track organization.id) {
            <article class="content-panel organization-card">
              <div>
                <h2>{{ organization.name }}</h2>
                <p>{{ organization.slug }}</p>
              </div>
              <dl>
                <div>
                  <dt>Role</dt>
                  <dd>{{ organization.role }}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{{ organization.plan }}</dd>
                </div>
                <div>
                  <dt>AI usage</dt>
                  <dd>{{ organization.aiUsageCount }} / {{ organization.aiUsageLimit }}</dd>
                </div>
              </dl>
              <div class="card-actions">
                <button mat-stroked-button type="button" (click)="openIssues(organization.id)">
                  <mat-icon>confirmation_number</mat-icon>
                  Issues
                </button>
                <button mat-stroked-button type="button" (click)="openTelegram(organization.id)">
                  <mat-icon>send</mat-icon>
                  Telegram
                </button>
                <button mat-icon-button type="button" aria-label="Copy public report link" (click)="copyPublicReportLink(organization)">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            </article>
          } @empty {
            <section class="content-panel empty-panel">
              <h2>No organizations yet</h2>
              <p>Create your first organization to start collecting issues.</p>
              <a mat-flat-button routerLink="/organizations/new">Create organization</a>
            </section>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      .organization-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
      }

      .organization-card {
        display: grid;
        gap: 18px;
        padding: 20px;
      }

      h2 {
        margin: 0;
        color: #111827;
        font-size: 20px;
        letter-spacing: 0;
      }

      p {
        margin: 6px 0 0;
        color: #647084;
      }

      dl {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      dt {
        color: #647084;
        font-weight: 600;
      }

      dd {
        margin: 0;
        color: #172033;
        font-weight: 700;
      }

      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .empty-panel {
        padding: 28px;
      }
    `,
  ],
})
export class OrganizationsPageComponent implements OnInit {
  private readonly organizationsService = inject(OrganizationsService);
  private readonly organizationContextService = inject(OrganizationContextService);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  organizations: Organization[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.organizationsService
      .listOrganizations()
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (organizations) => {
          this.organizations = organizations;
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Organizations could not be loaded.');
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  openIssues(organizationId: string): void {
    this.organizationContextService.setSelectedOrganizationId(organizationId);
    void this.router.navigate(['/organizations', organizationId, 'issues']);
  }

  openTelegram(organizationId: string): void {
    this.organizationContextService.setSelectedOrganizationId(organizationId);
    void this.router.navigate(['/organizations', organizationId, 'telegram']);
  }

  copyPublicReportLink(organization: Organization): void {
    this.clipboard.copy(`${window.location.origin}/report/${organization.slug}`);
    this.snackBar.open('Public report link copied.', 'Close', { duration: 2500 });
  }
}
