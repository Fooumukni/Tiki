import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-create-issue-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  template: `
    <main class="page-shell narrow">
      <app-page-header
        eyebrow="Dashboard intake"
        title="Create issue"
        description="Create a support issue on behalf of a requester."
      >
        <a mat-stroked-button [routerLink]="['/organizations', organizationId, 'issues']">
          <mat-icon>arrow_back</mat-icon>
          Back
        </a>
      </app-page-header>

      <form class="content-panel form-panel" [formGroup]="form" (ngSubmit)="createIssue()">
        @if (errorMessage) {
          <app-error-state [message]="errorMessage" />
        }

        <section class="form-section">
          <div>
            <h2 class="section-title">Requester</h2>
            <p class="muted-text">Who is reporting this issue?</p>
          </div>
          <div class="field-grid">
            <mat-form-field appearance="outline">
              <mat-label>Requester name</mat-label>
              <input matInput formControlName="requesterName" />
              <mat-error>Requester name is required.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Requester email</mat-label>
              <input matInput formControlName="requesterEmail" />
              <mat-error>Enter a valid requester email.</mat-error>
            </mat-form-field>
          </div>
        </section>

        <section class="form-section">
          <div>
            <h2 class="section-title">Issue</h2>
            <p class="muted-text">Describe the support request clearly enough for triage.</p>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput rows="8" formControlName="originalDescription"></textarea>
            <mat-error>Description is required.</mat-error>
          </mat-form-field>
        </section>

        <div class="actions">
          <a mat-stroked-button [routerLink]="['/organizations', organizationId, 'issues']">Cancel</a>
          <button mat-flat-button type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon>
            {{ saving ? 'Creating' : 'Create issue' }}
          </button>
        </div>
      </form>
    </main>
  `,
  styles: [
    `
      .narrow {
        max-width: 820px;
      }

      .form-panel {
        display: grid;
        gap: 24px;
        padding: 24px;
      }

      .form-section {
        display: grid;
        gap: 14px;
      }

      .form-section p {
        margin: 6px 0 0;
      }

      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      @media (max-width: 720px) {
        .field-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CreateIssuePageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly issuesService = inject(IssuesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly organizationId = this.route.snapshot.paramMap.get('organizationId') ?? '';
  readonly form = this.formBuilder.group({
    requesterName: ['', [Validators.required, Validators.maxLength(120)]],
    requesterEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    title: ['', [Validators.maxLength(160)]],
    originalDescription: ['', [Validators.required, Validators.maxLength(10000)]],
  });

  saving = false;
  errorMessage = '';

  createIssue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.issuesService.createIssue(this.organizationId, this.form.getRawValue()).subscribe({
      next: (issue) => {
        void this.router.navigate(['/organizations', this.organizationId, 'issues', issue.id]);
      },
      error: (error: unknown) => {
        this.errorMessage = resolveApiErrorMessage(error, 'Issue could not be created.');
        this.saving = false;
      },
    });
  }
}
