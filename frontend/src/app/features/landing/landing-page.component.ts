import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <main class="page-shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Initial SaaS release</p>
          <div class="brand-hero">
            <img src="assets/tiki-logo.png" alt="Tiki Logo" class="hero-logo" />
            <h1>Tiki</h1>
          </div>
          <p class="summary">
            Receive, classify, prioritize, and manage support issues from your dashboard, public organization forms,
            and Telegram with AI-assisted triage.
          </p>
          <div class="actions">
            @if (authService.isAuthenticated()) {
              <a mat-flat-button routerLink="/dashboard">
                <mat-icon>dashboard</mat-icon>
                Open dashboard
              </a>
            } @else {
              <button mat-flat-button type="button" (click)="register()">
                <mat-icon>person_add</mat-icon>
                Create account
              </button>
              <button mat-stroked-button type="button" (click)="login()">
                <mat-icon>login</mat-icon>
                Login
              </button>
            }
          </div>
        </div>
        <div class="content-panel channels" aria-label="Supported intake channels">
          <span><mat-icon>space_dashboard</mat-icon>Dashboard web</span>
          <span><mat-icon>public</mat-icon>Public form per organization</span>
          <span><mat-icon>send</mat-icon>Telegram Bot</span>
          <span><mat-icon>auto_awesome</mat-icon>AI triage workflow</span>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
        gap: 32px;
        align-items: center;
        min-height: calc(100vh - 112px);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #2f5f98;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .brand-hero {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 16px;
      }

      .hero-logo {
        width: 72px;
        height: 72px;
        border-radius: 16px;
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      h1 {
        margin: 0;
        color: #111827;
        font-size: 56px;
        font-weight: 800;
        letter-spacing: -0.5px;
        line-height: 1.05;
      }

      .summary {
        max-width: 680px;
        margin: 20px 0 0;
        color: #4b5565;
        font-size: 18px;
        line-height: 1.65;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 28px;
      }

      .channels {
        display: grid;
        gap: 14px;
        padding: 24px;
      }

      .channels span {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        border-bottom: 1px solid #edf1f6;
        color: #293548;
        font-weight: 600;
      }

      .channels span:last-child {
        border-bottom: 0;
      }

      .channels mat-icon {
        color: #2f5f98;
      }

      @media (max-width: 760px) {
        .hero {
          grid-template-columns: 1fr;
          min-height: auto;
        }

        h1 {
          font-size: 36px;
        }
      }
    `,
  ],
})
export class LandingPageComponent {
  readonly authService = inject(AuthService);

  async login(): Promise<void> {
    await this.authService.login();
  }

  async register(): Promise<void> {
    await this.authService.register();
  }
}
