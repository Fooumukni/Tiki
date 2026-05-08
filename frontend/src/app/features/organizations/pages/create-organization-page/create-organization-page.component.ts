import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { AccountService } from '../../../../core/auth/account.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { OrganizationContextService } from '../../services/organization-context.service';
import { OrganizationsService } from '../../services/organizations.service';

@Component({
  selector: 'app-create-organization-page',
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
        eyebrow="Setup"
        title="Create organization"
        description="Create a workspace for your support team, public form, and integrations."
      />

      <form class="content-panel form-panel" [formGroup]="form" (ngSubmit)="createOrganization()">
        @if (errorMessage) {
          <app-error-state [message]="errorMessage" />
        }

        <mat-form-field appearance="outline">
          <mat-label>Organization name</mat-label>
          <input matInput formControlName="name" autocomplete="organization" />
          <mat-error>Name is required and must be 120 characters or less.</mat-error>
        </mat-form-field>

        <div class="actions">
          <a mat-stroked-button routerLink="/organizations">Cancel</a>
          <button mat-flat-button type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add_business</mat-icon>
            {{ saving ? 'Creating' : 'Create organization' }}
          </button>
        </div>
      </form>
    </main>
  `,
  styles: [
    `
      .narrow {
        max-width: 760px;
      }

      .form-panel {
        display: grid;
        gap: 18px;
        padding: 24px;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
    `,
  ],
})
export class CreateOrganizationPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly organizationContextService = inject(OrganizationContextService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  saving = false;
  errorMessage = '';

  createOrganization(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.organizationsService.createOrganization(this.form.getRawValue()).subscribe({
      next: (organization) => {
        this.accountService.clearCache();
        this.organizationContextService.setSelectedOrganizationId(organization.id);
        this.accountService
          .getCurrentUser(true)
          .pipe(
            take(1),
            finalize(() => {
              this.saving = false;
            }),
          )
          .subscribe({
            next: () => {
              void this.router.navigate(['/organizations', organization.id, 'issues']);
            },
            error: () => {
              void this.router.navigate(['/organizations', organization.id, 'issues']);
            },
          });
      },
      error: (error: unknown) => {
        this.errorMessage = resolveApiErrorMessage(error, 'Organization could not be created.');
        this.saving = false;
      },
    });
  }
}
