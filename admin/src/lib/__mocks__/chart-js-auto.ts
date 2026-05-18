/**
 * Mock for chart.js/auto — used in unit tests.
 * STORY-028-07: supports per-test Chart constructor overrides.
 *
 * Tests can set __chartMocks__.Chart to a mock function:
 *   import { __chartMocks__ } from '../../src/lib/__mocks__/chart-js-auto.ts';
 *   beforeEach(() => { __chartMocks__.Chart = mock.fn(...); });
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartConstructor = new (...args: any[]) => any;

export const __chartMocks__: {
  Chart?: ChartConstructor;
} = {};

// Default no-op Chart constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DefaultChart: ChartConstructor = class Chart {
  data = { labels: [] as unknown[], datasets: [{ data: [] as unknown[] }] };
  destroy() {}
  update() {}
} as unknown as ChartConstructor;
// Attach static properties that chart.js components use
(DefaultChart as unknown as Record<string, unknown>)['defaults'] = { color: '#000', borderColor: '#666' };

// Export Chart as a proxy that uses __chartMocks__.Chart if set
export const Chart: ChartConstructor = new Proxy(DefaultChart, {
  construct(target, args) {
    const ctor = __chartMocks__.Chart ?? target;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (ctor as any)(...args);
  },
  get(target, prop) {
    const ctor = __chartMocks__.Chart ?? target;
    return (ctor as unknown as Record<string, unknown>)[prop as string] ?? (target as unknown as Record<string, unknown>)[prop as string];
  },
});

// Register is needed for chart.js plugins
export const register = (..._args: unknown[]): void => {};

export default { Chart, register };
