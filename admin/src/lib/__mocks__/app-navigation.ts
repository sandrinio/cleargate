/**
 * $app/navigation stub for unit tests.
 *
 * STORY-028-07: Updated to support per-test overrides via __overrides__.
 * Tests can set __overrides__.goto = mock.fn() before rendering a component.
 *
 * Usage in test:
 *   import { __overrides__ } from '../../src/lib/__mocks__/app-navigation.ts';
 *   beforeEach(() => { __overrides__.goto = mock.fn(); });
 *   afterEach(() => { __overrides__.goto = undefined; });
 *   // assert on __overrides__.goto.mock.calls
 */

type NavCallback = (nav: { cancel: () => void }) => void;

export const __overrides__: {
  goto?: (...args: unknown[]) => unknown;
  beforeNavigate?: (...args: unknown[]) => unknown;
  goto_mock_fn?: unknown;
} = {};

export function beforeNavigate(fn: NavCallback): void {
  if (__overrides__.beforeNavigate) {
    __overrides__.beforeNavigate(fn);
    return;
  }
  // no-op in unit test environment
}

export function afterNavigate(_fn: () => void): void {
  // no-op in unit test environment
}

export async function goto(url: string, opts?: unknown): Promise<void> {
  if (__overrides__.goto) {
    await (__overrides__.goto as (url: string, opts?: unknown) => unknown)(url, opts);
    return;
  }
  // no-op in unit test environment
}

export function invalidate(_url: string): Promise<void> {
  return Promise.resolve();
}

export function invalidateAll(): Promise<void> {
  return Promise.resolve();
}

export function preloadData(_url: string): Promise<void> {
  return Promise.resolve();
}

export function preloadCode(_url: string): void {
  // no-op
}
