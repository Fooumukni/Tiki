import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PublicIssueCreatedResponse } from '../../../../shared/models/public-report.model';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { PublicReportService } from '../../services/public-report.service';

@Component({
  selector: 'app-public-report-page',
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
        eyebrow="Public report"
        title="Submit a support request"
        description="Send your request to the support team. You do not need to sign in."
      />

      @if (createdIssue) {
        <section class="content-panel success-panel">
          <mat-icon>check_circle</mat-icon>
          <h2>{{ createdIssue.message }}</h2>
          <p>Your reference code is <strong>{{ createdIssue.code }}</strong>.</p>
          <a mat-stroked-button routerLink="/">Back to home</a>
        </section>
      } @else {
        <form class="content-panel form-panel" [formGroup]="form" (ngSubmit)="submitReport()">
          @if (errorMessage) {
            <app-error-state [message]="errorMessage" />
          }

          <mat-form-field appearance="outline">
            <mat-label>Your name</mat-label>
            <input matInput formControlName="requesterName" />
            <mat-error>Name is required.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Your email</mat-label>
            <input matInput formControlName="requesterEmail" />
            <mat-error>Enter a valid email.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" />
            <mat-error>Title is required.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput rows="8" formControlName="originalDescription"></textarea>
            <mat-error>Description is required.</mat-error>
          </mat-form-field>

          <div class="actions">
            <button mat-flat-button type="submit" [disabled]="form.invalid || submitting">
              <mat-icon>send</mat-icon>
              {{ submitting ? 'Submitting' : 'Submit request' }}
            </button>
          </div>
        </form>
      }
    </main>
  `,
  styles: [
    `
      .narrow {
        max-width: 820px;
      }

      .form-panel,
      .success-panel {
        display: grid;
        gap: 18px;
        padding: 24px;
      }

      .success-panel {
        place-items: center;
        text-align: center;
      }

      .success-panel mat-icon {
        color: #2f7d55;
        font-size: 42px;
        height: 42px;
        width: 42px;
      }

      .success-panel h2 {
        margin: 0;
        color: #111827;
        letter-spacing: 0;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class PublicReportPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly publicReportService = inject(PublicReportService);
  private readonly route = inject(ActivatedRoute);

  readonly organizationSlug = this.route.snapshot.paramMap.get('organizationSlug') ?? '';
  readonly form = this.formBuilder.group({
    requesterName: ['', [Validators.required, Validators.maxLength(120)]],
    requesterEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    originalDescription: ['', [Validators.required, Validators.maxLength(10000)]],
  });

  submitting = false;
  errorMessage = '';
  createdIssue: PublicIssueCreatedResponse | null = null;

  submitReport(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.publicReportService.createIssue(this.organizationSlug, this.form.getRawValue()).subscribe({
      next: (response) => {
        this.createdIssue = response;
        this.submitting = false;
      },
      error: (error: unknown) => {
        this.errorMessage = resolveApiErrorMessage(error, 'Your support request could not be submitted.');
        this.submitting = false;
      },
    });
  }
}
