import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it('renders the issue status label', () => {
    const fixture: ComponentFixture<StatusBadgeComponent> = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', 'IN_PROGRESS');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('IN_PROGRESS');
    expect(badge.classList.contains('in_progress')).toBe(true);
  });
});
