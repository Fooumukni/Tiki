import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PriorityBadgeComponent } from './priority-badge.component';

describe('PriorityBadgeComponent', () => {
  it('renders the issue priority label', () => {
    const fixture: ComponentFixture<PriorityBadgeComponent> = TestBed.createComponent(PriorityBadgeComponent);
    fixture.componentRef.setInput('priority', 'CRITICAL');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('CRITICAL');
    expect(badge.classList.contains('critical')).toBe(true);
  });
});
