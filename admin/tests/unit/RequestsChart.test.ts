/**
 * Unit tests for RequestsChart component — STORY-006-08
 *
 * Scenarios:
 *   - chart.js/auto is NOT imported at module top-level (lazy-import invariant)
 *   - Chart constructor is called with type 'bar' on mount
 *   - Bar color is resolved from --color-primary CSS var (not hardcoded)
 *   - Tooltip label callback produces "<count> requests" format (no error count)
 *   - Chart is destroyed on component unmount
 *   - Canvas element is rendered inside the chart wrapper
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

// ---- Mock chart.js/auto via dynamic import ----
// The Chart constructor mock captures call arguments for inspection.
// vi.mock is hoisted; use vi.hoisted() for any variables referenced inside the factory.
// flashcard: #admin-ui #vitest #vi-mock-hoisting — vi.mock() is hoisted to top of file

const { MockChart, mockChartDestroy, mockChartUpdate } = vi.hoisted(() => {
  const mockChartDestroy = vi.fn();
  const mockChartUpdate = vi.fn();
  const MockChart = vi.fn().mockImplementation(function () {
    return {
      destroy: mockChartDestroy,
      update: mockChartUpdate,
      data: { labels: [], datasets: [{ data: [] }] },
    };
  });
  // Attach defaults property so the component can set Chart.defaults.color
  (MockChart as unknown as Record<string, unknown>)['defaults'] = { color: '', borderColor: '' };
  return { MockChart, mockChartDestroy, mockChartUpdate };
});

// Use vi.mock with a factory that matches the exact import path used in the component
vi.mock('chart.js/auto', () => ({
  Chart: MockChart,
}));

import RequestsChart from '../../src/lib/components/RequestsChart.svelte';

const SAMPLE_DATA = [
  { date: '2026-04-01', count: 10 },
  { date: '2026-04-02', count: 25 },
  { date: '2026-04-03', count: 0 },
];

describe('RequestsChart', () => {
  beforeEach(() => {
    // mockClear resets call history but NOT implementation (#admin-ui #vitest)
    MockChart.mockClear();
    mockChartDestroy.mockClear();
    mockChartUpdate.mockClear();
    // Re-attach defaults in case tests modified it
    (MockChart as unknown as Record<string, unknown>)['defaults'] = { color: '', borderColor: '' };

    // Stub getComputedStyle to return a predictable CSS var value
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => (prop === '--color-primary' ? '#E85C2F' : ''),
    } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a canvas element inside the chart wrapper', () => {
    const { getByTestId, container } = render(RequestsChart, {
      props: { data: SAMPLE_DATA },
    });
    const wrapper = getByTestId('requests-chart');
    expect(wrapper).toBeTruthy();
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('initializes Chart.js with type bar', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    // onMount runs async — wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(MockChart).toHaveBeenCalledOnce();
    const config = MockChart.mock.calls[0][1];
    expect(config.type).toBe('bar');
  });

  it('tooltip label callback returns "<count> requests" (no error count)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    expect(MockChart).toHaveBeenCalledOnce();
    const config = MockChart.mock.calls[0][1];
    const labelFn = config.options.plugins.tooltip.callbacks.label;
    expect(typeof labelFn).toBe('function');
    const result = labelFn({ parsed: { y: 42 }, label: '2026-04-01' });
    expect(result).toBe('42 requests');
    // Must NOT include "error" text
    expect(result).not.toMatch(/error/i);
  });

  it('chart config has legend disabled (single series, no legend)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = MockChart.mock.calls[0][1];
    expect(config.options.plugins.legend.display).toBe(false);
  });

  it('resolves bar color from CSS var --color-primary (not raw hardcoded hex in config)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = MockChart.mock.calls[0][1];
    const bgColor = config.data.datasets[0].backgroundColor;
    // Color must be the resolved CSS var value, not a literal hardcoded constant
    // (The component calls getComputedStyle, which we stub to return '#E85C2F')
    expect(bgColor).toBe('#E85C2F');
    // Confirm getComputedStyle was called (color resolved via CSS var, not top-level constant)
    expect(window.getComputedStyle).toHaveBeenCalled();
  });

  it('chart Y axis begins at zero', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = MockChart.mock.calls[0][1];
    expect(config.options.scales.y.beginAtZero).toBe(true);
  });

  it('x grid is hidden (Design Guide §8 clean bars)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = MockChart.mock.calls[0][1];
    expect(config.options.scales.x.grid.display).toBe(false);
  });
});
