import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import { Issue } from '../../models/issue.model';
import { IssueTableComponent } from './issue-table.component';

describe('IssueTableComponent', () => {
  it('renders issue metadata and emits view actions', () => {
    TestBed.configureTestingModule({
      imports: [IssueTableComponent],
      providers: [provideNoopAnimations()],
    });
    const fixture: ComponentFixture<IssueTableComponent> = TestBed.createComponent(IssueTableComponent);
    const viewIssue = vi.fn();
    fixture.componentRef.setInput('issues', [createIssue()]);
    fixture.componentRef.setInput('showPaginator', false);
    fixture.componentInstance.viewIssue.subscribe(viewIssue);
    fixture.detectChanges();

    const tableText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const codeButton = (fixture.nativeElement as HTMLElement).querySelector('.code-button') as HTMLButtonElement;

    expect(tableText).toContain('ISSUE-00001');
    expect(tableText).toContain('Login error');
    expect(tableText).toContain('Jane Customer');
    codeButton.click();
    expect(viewIssue).toHaveBeenCalledWith('issue-id');
  });
});

function createIssue(): Issue {
  return {
    id: 'issue-id',
    organizationId: 'organization-id',
    requesterId: 'requester-id',
    code: 'ISSUE-00001',
    title: 'Login error',
    originalDescription: 'Login returns error 500.',
    generatedTitle: null,
    summary: null,
    category: null,
    priority: 'HIGH',
    sentiment: null,
    suggestedTeam: null,
    suggestedResponse: null,
    tags: [],
    sourceChannel: 'DASHBOARD',
    status: 'NEW',
    aiAnalysisStatus: 'PENDING',
    requester: {
      id: 'requester-id',
      name: 'Jane Customer',
      email: 'jane@example.com',
    },
    createdAt: '2026-05-07T12:00:00.000Z',
    updatedAt: '2026-05-07T12:00:00.000Z',
    resolvedAt: null,
  };
}
