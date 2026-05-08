import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountService } from '../auth/account.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../../shared/models/auth.model';
import { OrganizationContextService } from '../../features/organizations/services/organization-context.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  template: `
    @if (authService.isAuthenticated()) {
      <mat-sidenav-container class="app-frame">
        <mat-sidenav mode="side" opened class="sidebar">
          <a routerLink="/dashboard" class="brand-block">
            <img src="assets/tiki-logo.png" alt="Tiki" class="brand-logo" />
            <span>Tiki</span>
          </a>

          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
              <mat-icon matListItemIcon>space_dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>
            <a mat-list-item routerLink="/organizations" routerLinkActive="active-link">
              <mat-icon matListItemIcon>business</mat-icon>
              <span matListItemTitle>Organizations</span>
            </a>
            <a mat-list-item [routerLink]="organizationScopedLink('issues')" routerLinkActive="active-link">
              <mat-icon matListItemIcon>confirmation_number</mat-icon>
              <span matListItemTitle>Issues</span>
            </a>
            <a mat-list-item [routerLink]="organizationScopedLink('telegram')" routerLinkActive="active-link">
              <mat-icon matListItemIcon>send</mat-icon>
              <span matListItemTitle>Telegram</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <mat-toolbar class="app-topbar">
            <div class="topbar-title">
              <span>Workspace console</span>
              <strong>{{ currentUser?.fullName || currentUser?.email || 'User' }}</strong>
            </div>
            <span class="spacer"></span>
            @if (currentUser?.memberships?.length) {
              <mat-select
                class="topbar-selector"
                aria-label="Selected organization"
                [ngModel]="selectedOrganizationId"
                (ngModelChange)="changeOrganization($event)"
              >
                @for (membership of currentUser?.memberships; track membership.organizationId) {
                  <mat-option [value]="membership.organizationId">{{ membership.organizationName }}</mat-option>
                }
              </mat-select>
            }
            <button mat-stroked-button type="button" (click)="logout()">
              <mat-icon>logout</mat-icon>
              Logout
            </button>
          </mat-toolbar>
          <div class="app-content">
            <router-outlet />
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <mat-toolbar class="public-toolbar">
        <a routerLink="/" class="public-brand">Tiki</a>
        <span class="spacer"></span>
        <button mat-flat-button type="button" (click)="login()">
          <mat-icon>login</mat-icon>
          Login
        </button>
      </mat-toolbar>
      <router-outlet />
    }
  `,
  styles: [
    `
      .app-frame {
        min-height: 100vh;
        background: #f4f7fb;
      }

      .sidebar {
        width: 260px;
        border-right: 1px solid #d9e1ec;
        background: #ffffff;
      }

      .brand-block {
        display: flex;
        gap: 12px;
        align-items: center;
        color: #172033;
        font-size: 20px;
        font-weight: 750;
        letter-spacing: 0;
        padding: 20px;
        text-decoration: none;
      }

      .brand-logo {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        object-fit: cover;
      }

      mat-nav-list {
        padding: 8px 10px;
      }

      a[mat-list-item] {
        border-radius: 8px;
        margin-bottom: 4px;
      }

      .active-link {
        background: #edf4fc;
        color: #235987;
      }

      .app-topbar,
      .public-toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        border-bottom: 1px solid #d9e1ec;
        background: #ffffff;
        color: #172033;
      }

      .app-topbar {
        min-height: 64px;
        padding: 0 24px;
      }

      .topbar-title {
        display: grid;
        gap: 2px;
      }

      .topbar-title span {
        color: #647084;
        font-size: 12px;
        font-weight: 700;
      }

      .topbar-title strong {
        color: #111827;
        font-size: 15px;
        font-weight: 750;
        line-height: 1.1;
      }

      .topbar-selector {
        width: 260px;
        margin-right: 12px;
      }

      .app-content {
        min-height: calc(100vh - 64px);
      }

      .public-brand {
        color: inherit;
        font-size: 17px;
        font-weight: 750;
        text-decoration: none;
      }

      .spacer {
        flex: 1;
      }

      @media (max-width: 900px) {
        .sidebar {
          width: 76px;
        }

        .brand-block span:last-child,
        a[mat-list-item] span[matListItemTitle] {
          display: none;
        }

        .brand-block {
          justify-content: center;
          padding: 20px 10px;
        }

        .topbar-selector {
          width: 180px;
        }
      }

      @media (max-width: 640px) {
        .sidebar {
          display: none;
        }

        .app-topbar {
          align-items: flex-start;
          flex-direction: column;
          gap: 10px;
          height: auto;
          padding: 12px 16px;
        }

        .topbar-selector {
          width: 100%;
          margin-right: 0;
        }
      }
    `,
  ],
})
export class ShellComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly organizationContextService = inject(OrganizationContextService);
  private readonly router = inject(Router);

  currentUser: AuthenticatedUser | null = null;
  selectedOrganizationId: string | null = null;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.accountService.currentUser$.subscribe((currentUser) => {
      if (!currentUser) {
        return;
      }

      this.currentUser = currentUser;
      this.selectedOrganizationId = this.organizationContextService.getSelectedOrganizationId(currentUser.memberships);
    });

    this.accountService.getCurrentUser(true).pipe(take(1)).subscribe({
      next: () => undefined,
    });
  }

  organizationScopedLink(section: 'issues' | 'telegram'): string[] {
    if (!this.selectedOrganizationId) {
      return ['/organizations', 'new'];
    }

    return section === 'issues'
      ? ['/organizations', this.selectedOrganizationId, 'issues']
      : ['/organizations', this.selectedOrganizationId, 'telegram'];
  }

  changeOrganization(organizationId: string): void {
    if (!organizationId) {
      return;
    }

    this.selectedOrganizationId = organizationId;
    this.organizationContextService.setSelectedOrganizationId(organizationId);

    const targetRoute = this.resolveOrganizationRoute(organizationId);
    const targetUrl = this.router.serializeUrl(this.router.createUrlTree(targetRoute));

    if (this.router.url === targetUrl) {
      return;
    }

    void this.router.navigate(targetRoute);
  }

  private resolveOrganizationRoute(organizationId: string): string[] {
    if (this.router.url.includes('/telegram')) {
      return ['/organizations', organizationId, 'telegram'];
    }

    if (this.router.url.includes('/organizations')) {
      return ['/organizations', organizationId, 'issues'];
    }

    return ['/dashboard'];
  }

  async login(): Promise<void> {
    await this.authService.login();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}
