import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TelegramConnection } from '../../../../shared/models/telegram.model';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-message';
import { TelegramSettingsService } from '../../services/telegram-settings.service';

@Component({
  selector: 'app-telegram-settings-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <main class="page-shell">
      <app-page-header
        eyebrow="Integration"
        title="Telegram settings"
        description="Connect a Telegram chat to this organization so incoming messages become issues."
      >
        <a mat-stroked-button [routerLink]="['/organizations', organizationId, 'issues']">
          <mat-icon>confirmation_number</mat-icon>
          Issues
        </a>
        <button mat-flat-button type="button" (click)="generateConnection()" [disabled]="saving || loading">
          <mat-icon>link</mat-icon>
          {{ saving ? 'Generating...' : 'Generate connection' }}
        </button>
      </app-page-header>

      @if (errorMessage) {
        <app-error-state [message]="errorMessage" />
      } @else {
        <section class="settings-grid">
          <article class="content-panel status-card">
            <div class="status-heading">
              <div class="status-icon">
                <mat-icon>send</mat-icon>
              </div>
              <div>
                <h2>{{ activeConnection?.isLinked ? 'Telegram is linked' : 'Telegram is not linked' }}</h2>
                <p>{{ activeConnection?.isLinked ? 'Messages from the linked chat can create issues.' : 'Generate a link and open it in Telegram to connect the bot.' }}</p>
              </div>
            </div>

            @if (loading && !activeConnection) {
              <app-loading-state label="Loading Telegram settings" />
            } @else if (activeConnection) {
              <dl>
                <div>
                  <dt>Bot username</dt>
                  <dd>{{ activeConnection.botUsername }}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{{ activeConnection.isActive ? 'Active' : 'Inactive' }}</dd>
                </div>
                <div>
                  <dt>Chat ID</dt>
                  <dd>{{ activeConnection.linkedChatId || 'Not linked' }}</dd>
                </div>
                <div>
                  <dt>Linked at</dt>
                  <dd>{{ activeConnection.linkedAt ? (activeConnection.linkedAt | date: 'medium') : 'Not linked' }}</dd>
                </div>
              </dl>

              @if (activeConnection.link) {
                <div class="link-box">
                  <span>{{ activeConnection.link }}</span>
                  <button mat-icon-button type="button" aria-label="Copy Telegram link" (click)="copyLink(activeConnection.link)">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              }
            } @else {
              <app-empty-state
                icon="send"
                title="No Telegram connection"
                message="Generate a connection link to begin setup."
              />
            }
          </article>

          <aside class="content-panel instructions-card">
            <h2 class="section-title">How to use the bot</h2>
            <ol>
              <li>Generate a connection link for this organization.</li>
              <li>Open the link in Telegram and send the /start message.</li>
              <li>After the chat is linked, send a support request to the bot.</li>
              <li>The backend creates an issue and replies with the issue code.</li>
            </ol>
          </aside>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .settings-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
      }

      .status-card,
      .instructions-card {
        display: grid;
        align-content: start;
        gap: 18px;
        padding: 22px;
      }

      .status-heading {
        display: flex;
        gap: 14px;
        align-items: center;
      }

      .status-icon {
        display: grid;
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        place-items: center;
        border-radius: 8px;
        background: #edf4fc;
        color: #235987;
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
        line-height: 1.5;
      }

      dl {
        display: grid;
        gap: 12px;
        margin: 0;
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 18px;
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

      .link-box {
        display: flex;
        gap: 8px;
        align-items: center;
        border: 1px solid #d9e1ec;
        border-radius: 8px;
        background: #f8fafc;
        padding: 10px 12px;
      }

      .link-box span {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      ol {
        display: grid;
        gap: 12px;
        margin: 0;
        padding-left: 20px;
        color: #3f4b5f;
        line-height: 1.55;
      }

      @media (max-width: 900px) {
        .settings-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TelegramSettingsPageComponent implements OnInit {
  private readonly telegramSettingsService = inject(TelegramSettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly organizationId = this.route.snapshot.paramMap.get('organizationId') ?? '';
  connections: TelegramConnection[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  private readonly loadTimeoutMs = 8000;

  get activeConnection(): TelegramConnection | null {
    return this.connections.find((connection) => connection.isActive) ?? this.connections[0] ?? null;
  }

  ngOnInit(): void {
    this.loadConnections();
  }

  generateConnection(): void {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.telegramSettingsService
      .createConnection(this.organizationId)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (connection) => {
          this.loading = false;
          this.connections = [
            connection,
            ...this.connections
              .filter((existingConnection) => existingConnection.id !== connection.id)
              .map((existingConnection) => ({ ...existingConnection, isActive: false })),
          ];
          this.changeDetectorRef.detectChanges();
          this.snackBar.open('Telegram connection link generated.', 'Close', { duration: 2500 });
          this.loadConnections(false);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveApiErrorMessage(error, 'Telegram connection could not be generated.');
        },
      });
  }

  copyLink(link: string): void {
    this.clipboard.copy(link);
    this.snackBar.open('Telegram link copied.', 'Close', { duration: 2500 });
  }

  private loadConnections(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';
    const loadingTimeout = window.setTimeout(() => {
      if (!this.loading) {
        return;
      }

      this.loading = false;
      this.errorMessage = 'Telegram settings took too long to load. Please refresh the page.';
      this.changeDetectorRef.detectChanges();
    }, this.loadTimeoutMs);

    this.telegramSettingsService
      .listConnections(this.organizationId)
      .pipe(
        take(1),
        finalize(() => {
          window.clearTimeout(loadingTimeout);
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (connections) => {
          this.connections = connections;
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          if (showLoading) {
            this.errorMessage = resolveApiErrorMessage(error, 'Telegram settings could not be loaded.');
          }
        },
      });
  }
}
