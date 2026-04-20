/**
 * Unit tests for WindowSelector component — STORY-006-08
 *
 * Scenarios:
 *   - Renders all three window buttons (7d / 30d / 90d)
 *   - Default active window is 30d when no URL param set
 *   - Active button has btn-primary class; inactive buttons have btn-ghost
 *   - Clicking a button calls goto with updated ?window= param
 *   - aria-pressed reflects active state correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WindowSelector from '../../src/lib/components/WindowSelector.svelte';

// $app/stores page stub uses URL http://localhost/ (no ?window param) — default 30d
// $app/navigation goto is spied on to assert URL changes
// vi.mock is hoisted so gotoMock must be declared via vi.hoisted() — flashcard #admin-ui #vitest

const { gotoMock } = vi.hoisted(() => ({ gotoMock: vi.fn() }));

vi.mock('$app/navigation', () => ({
  goto: gotoMock,
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
  invalidate: vi.fn(),
  invalidateAll: vi.fn(),
  preloadData: vi.fn(),
  preloadCode: vi.fn(),
}));

describe('WindowSelector', () => {
  beforeEach(() => {
    gotoMock.mockReset();
  });

  it('renders all three window buttons', () => {
    const { getByTestId } = render(WindowSelector);
    expect(getByTestId('window-btn-7d')).toBeTruthy();
    expect(getByTestId('window-btn-30d')).toBeTruthy();
    expect(getByTestId('window-btn-90d')).toBeTruthy();
  });

  it('default active window is 30d (no URL param)', () => {
    const { getByTestId } = render(WindowSelector);
    // Active button has btn-primary
    expect(getByTestId('window-btn-30d').classList.contains('btn-primary'), '30d is active').toBe(
      true,
    );
    // Inactive buttons have btn-ghost
    expect(getByTestId('window-btn-7d').classList.contains('btn-ghost'), '7d is inactive').toBe(
      true,
    );
    expect(getByTestId('window-btn-90d').classList.contains('btn-ghost'), '90d is inactive').toBe(
      true,
    );
  });

  it('aria-pressed is true only on the active window button', () => {
    const { getByTestId } = render(WindowSelector);
    expect(getByTestId('window-btn-30d').getAttribute('aria-pressed')).toBe('true');
    expect(getByTestId('window-btn-7d').getAttribute('aria-pressed')).toBe('false');
    expect(getByTestId('window-btn-90d').getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking 7d button calls goto with ?window=7d', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-7d'));
    expect(gotoMock).toHaveBeenCalledOnce();
    const calledUrl: string = gotoMock.mock.calls[0][0];
    expect(calledUrl).toContain('window=7d');
  });

  it('clicking 90d button calls goto with ?window=90d', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-90d'));
    expect(gotoMock).toHaveBeenCalledOnce();
    const calledUrl: string = gotoMock.mock.calls[0][0];
    expect(calledUrl).toContain('window=90d');
  });

  it('goto is called with keepFocus option', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-7d'));
    const opts = gotoMock.mock.calls[0][1];
    expect(opts).toMatchObject({ keepFocus: true, noScroll: true });
  });

  it('has role="group" with aria-label on the container', () => {
    const { container } = render(WindowSelector);
    const group = container.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.getAttribute('aria-label')).toBe('Time window');
  });
});
