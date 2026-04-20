/**
 * Unit tests for ValueChip component — STORY-006-08
 *
 * Scenarios:
 *   - Renders label and value correctly
 *   - Applies Design Guide §6.3 classes (rounded-full bg-accent text-accent-content
 *     text-sm font-semibold px-3 py-1 tabular-nums)
 *   - Renders optional hint when provided
 *   - Does not render hint element when hint is absent
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ValueChip from '../../src/lib/components/ValueChip.svelte';

describe('ValueChip', () => {
  it('renders the value text', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '1234' },
    });
    const valueEl = getByTestId('value-chip-value');
    expect(valueEl.textContent?.trim()).toBe('1234');
  });

  it('renders the label text', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Error rate', value: '2.3%' },
    });
    const labelEl = getByTestId('value-chip-label');
    expect(labelEl.textContent?.trim()).toBe('Error rate');
  });

  it('applies Design Guide §6.3 classes on value element', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '42' },
    });
    const valueEl = getByTestId('value-chip-value');
    expect(valueEl.classList.contains('rounded-full'), 'rounded-full').toBe(true);
    expect(valueEl.classList.contains('bg-accent'), 'bg-accent').toBe(true);
    expect(valueEl.classList.contains('text-accent-content'), 'text-accent-content').toBe(true);
    expect(valueEl.classList.contains('text-sm'), 'text-sm').toBe(true);
    expect(valueEl.classList.contains('font-semibold'), 'font-semibold').toBe(true);
    expect(valueEl.classList.contains('px-3'), 'px-3').toBe(true);
    expect(valueEl.classList.contains('py-1'), 'py-1').toBe(true);
    expect(valueEl.classList.contains('tabular-nums'), 'tabular-nums').toBe(true);
  });

  it('renders hint text when hint prop is provided', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '100', hint: 'over 7 days' },
    });
    const hintEl = getByTestId('value-chip-hint');
    expect(hintEl.textContent?.trim()).toBe('over 7 days');
  });

  it('does not render hint element when hint is not provided', () => {
    const { queryByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '100' },
    });
    expect(queryByTestId('value-chip-hint')).toBeNull();
  });

  it('renders "—" as value string for empty/null-like display', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Error rate', value: '—' },
    });
    expect(getByTestId('value-chip-value').textContent?.trim()).toBe('—');
  });
});
