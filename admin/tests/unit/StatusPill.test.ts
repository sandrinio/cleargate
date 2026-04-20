/**
 * Unit tests for StatusPill component — STORY-006-04
 *
 * Scenarios covered:
 *   - All four status variants render with correct semantic class tokens (DG §6.2)
 *   - Default label is capitalised status string
 *   - Optional label override is displayed
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import StatusPill from '../../src/lib/components/StatusPill.svelte';

describe('StatusPill', () => {
  it('renders "Active" variant with bg-success class (DG §6.2 green)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'active' } });
    const el = getByText('Active');
    expect(el.classList.contains('bg-success')).toBe(true);
    expect(el.classList.contains('text-success-content')).toBe(true);
  });

  it('renders "Pending" variant with bg-warning class (DG §6.2 amber)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'pending' } });
    const el = getByText('Pending');
    expect(el.classList.contains('bg-warning')).toBe(true);
    expect(el.classList.contains('text-warning-content')).toBe(true);
  });

  it('renders "Expired" variant with bg-error class (DG §6.2 red)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'expired' } });
    const el = getByText('Expired');
    expect(el.classList.contains('bg-error')).toBe(true);
    expect(el.classList.contains('text-error-content')).toBe(true);
  });

  it('renders "Revoked" variant with bg-neutral class (DG §6.2 gray)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'revoked' } });
    const el = getByText('Revoked');
    expect(el.classList.contains('bg-neutral')).toBe(true);
    expect(el.classList.contains('text-neutral-content')).toBe(true);
  });

  it('uses DG §6.2 base classes on all variants', () => {
    const statuses = ['active', 'pending', 'expired', 'revoked'] as const;
    for (const status of statuses) {
      const { container } = render(StatusPill, { props: { status } });
      const el = container.querySelector('span')!;
      expect(el.classList.contains('rounded-full'), `${status}: rounded-full`).toBe(true);
      expect(el.classList.contains('text-xs'), `${status}: text-xs`).toBe(true);
      expect(el.classList.contains('font-semibold'), `${status}: font-semibold`).toBe(true);
      expect(el.classList.contains('px-2.5'), `${status}: px-2.5`).toBe(true);
      expect(el.classList.contains('py-0.5'), `${status}: py-0.5`).toBe(true);
    }
  });

  it('renders custom label override instead of status name', () => {
    const { getByText } = render(StatusPill, {
      props: { status: 'active', label: 'Joined' },
    });
    expect(getByText('Joined')).toBeTruthy();
  });
});
