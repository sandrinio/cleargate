/**
 * $app/navigation stub for vitest unit tests.
 * SvelteKit's $app/navigation is not available in jsdom; this stub
 * provides no-op implementations so components that import it can be tested.
 *
 * Note: tests that need to assert beforeNavigate behaviour should mock this
 * module via vi.mock('$app/navigation', ...) in their test file.
 */
export function beforeNavigate(_fn: (navigation: { cancel: () => void }) => void): void {
  // no-op in unit test environment
}

export function afterNavigate(_fn: () => void): void {
  // no-op in unit test environment
}

export async function goto(_url: string, _opts?: unknown): Promise<void> {
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
