/**
 * Unit tests for DateRangePicker — STORY-006-07
 *
 * Scenarios:
 *   - Renders From/To date inputs
 *   - Preset buttons exist and fire onchange with correct UTC values
 *   - "Last 7d" preset emits a range ~7 days wide
 *   - "Last 30d" preset emits a range ~30 days wide
 *   - Validation: to < from shows error, valid range does not
 *   - Emits UTC ISO-8601 from local date input values
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DateRangePicker from '../../src/lib/components/DateRangePicker.svelte';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('DateRangePicker', () => {
  it('renders From and To date inputs', () => {
    const { getByTestId } = render(DateRangePicker);
    expect(getByTestId('date-from')).toBeTruthy();
    expect(getByTestId('date-to')).toBeTruthy();
  });

  it('renders all preset buttons', () => {
    const { getByText, getByTestId } = render(DateRangePicker);
    expect(getByText('Today')).toBeTruthy();
    expect(getByTestId('preset-24h')).toBeTruthy();
    expect(getByTestId('preset-7d')).toBeTruthy();
    expect(getByTestId('preset-30d')).toBeTruthy();
  });

  it('"Last 7d" preset calls onchange with range ~7 days wide (UTC)', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    const before = Date.now();
    await fireEvent.click(getByTestId('preset-7d'));
    const after = Date.now();

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0][0] as { from: string; to: string };

    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const windowMs = toMs - fromMs;

    // Window should be ~7d ± a few ms of clock drift
    const expected = 7 * DAY_MS;
    expect(windowMs).toBeGreaterThanOrEqual(expected - 1000);
    expect(windowMs).toBeLessThanOrEqual(expected + 1000);

    // to should be close to "now"
    expect(toMs).toBeGreaterThanOrEqual(before);
    expect(toMs).toBeLessThanOrEqual(after + 100);

    // Values should be valid ISO-8601
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('"Last 30d" preset calls onchange with range ~30 days wide', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    await fireEvent.click(getByTestId('preset-30d'));

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0][0] as { from: string; to: string };
    const windowMs = new Date(to).getTime() - new Date(from).getTime();
    const expected = 30 * DAY_MS;
    expect(windowMs).toBeGreaterThanOrEqual(expected - 1000);
    expect(windowMs).toBeLessThanOrEqual(expected + 1000);
  });

  it('"Last 24h" preset calls onchange with range ~24 hours wide', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    await fireEvent.click(getByTestId('preset-24h'));

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0][0] as { from: string; to: string };
    const windowMs = new Date(to).getTime() - new Date(from).getTime();
    const expected = 24 * 60 * 60 * 1000;
    expect(windowMs).toBeGreaterThanOrEqual(expected - 1000);
    expect(windowMs).toBeLessThanOrEqual(expected + 1000);
  });

  it('shows validation error when to is before from', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(DateRangePicker, {
      props: {
        from: '2026-04-10T00:00:00.000Z',
        to: '2026-04-15T23:59:59.999Z',
        onchange,
      },
    });

    // Set from to a date AFTER to
    const fromInput = getByTestId('date-from') as HTMLInputElement;
    await fireEvent.change(fromInput, { target: { value: '2026-04-20' } });

    // Error message should appear
    const errorEl = getByTestId('drp-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('"From" must be before "To"');

    // onchange should NOT be called for invalid range
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not show validation error for a valid range', async () => {
    const onchange = vi.fn();
    const { getByTestId, queryByTestId } = render(DateRangePicker, {
      props: {
        from: '2026-04-01T00:00:00.000Z',
        to: '2026-04-07T23:59:59.999Z',
        onchange,
      },
    });

    // Adjust from to a valid earlier date
    const fromInput = getByTestId('date-from') as HTMLInputElement;
    await fireEvent.change(fromInput, { target: { value: '2026-03-25' } });

    expect(queryByTestId('drp-error')).toBeNull();
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('emits UTC ISO-8601 string from local date input', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(DateRangePicker, {
      props: { onchange },
    });

    // Set from and to via date inputs
    const fromInput = getByTestId('date-from');
    const toInput = getByTestId('date-to');
    await fireEvent.change(fromInput, { target: { value: '2026-04-11' } });
    await fireEvent.change(toInput, { target: { value: '2026-04-18' } });

    expect(onchange).toHaveBeenCalled();
    const { from, to } = onchange.mock.calls[onchange.mock.calls.length - 1][0] as { from: string; to: string };

    // Should be valid ISO-8601
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // from should be start-of-day, to should be end-of-day
    const fromDate = new Date(from);
    const toDate = new Date(to);
    expect(fromDate.getSeconds()).toBe(0);
    expect(toDate.getSeconds()).toBe(59);
    expect(toDate.getMilliseconds()).toBe(999);
  });
});
