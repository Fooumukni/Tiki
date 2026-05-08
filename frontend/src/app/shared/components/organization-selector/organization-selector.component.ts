import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MembershipSummary } from '../../models/auth.model';

@Component({
  selector: 'app-organization-selector',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="outline" class="selector">
      <mat-label>Organization</mat-label>
      <mat-select [ngModel]="selectedOrganizationId" (ngModelChange)="handleOrganizationChange($event)">
        @for (membership of memberships; track membership.organizationId) {
          <mat-option [value]="membership.organizationId">
            {{ membership.organizationName }}
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `
      .selector {
        width: min(100%, 320px);
      }
    `,
  ],
})
export class OrganizationSelectorComponent {
  @Input({ required: true }) memberships: MembershipSummary[] = [];
  @Input() selectedOrganizationId: string | null = null;
  @Output() organizationChange = new EventEmitter<string>();

  handleOrganizationChange(organizationId: string): void {
    if (!organizationId || organizationId === this.selectedOrganizationId) {
      return;
    }

    this.organizationChange.emit(organizationId);
  }
}
