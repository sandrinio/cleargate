/**
 * TokenIssuedModal unit tests — STORY-006-05 (SECURITY-CRITICAL)
 *
 * Scenarios:
 *   1. Close button is disabled when modal opens (checkbox not ticked)
 *   2. Ticking checkbox enables the Close button
 *   3. Close button click → onclose called (only when checkbox is ticked)
 *   4. beforeunload handler registered when modal opens
 *   5. beforeunload handler removed when modal closes
 *   6. beforeunload fires preventDefault when checkbox NOT checked
 *   7. beforeunload is a no-op when checkbox IS checked (handler removed early)
 *   8. Esc key is blocked (preventDefault called)
 *   9. Plaintext is rendered in the modal
 *  10. Copy button calls copyToClipboard and triggers success toast
 *  11. Toast text does NOT contain the token value
 *  12. beforeNavigate auto-closes modal + zeroes plaintext (QA kickback fix)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';

// Capture beforeNavigate callbacks so they can be invoked in tests.
// vi.hoisted() runs before vi.mock() factory evaluation, making the array
// accessible inside the hoisted factory scope.
const { navigateCallbacks } = vi.hoisted(() => {
  const navigateCallbacks: Array<(nav: { cancel: () => void }) => void> = [];
  return { navigateCallbacks };
});

// Mock $app/navigation — capture registered beforeNavigate callbacks
vi.mock('$app/navigation', () => ({
  beforeNavigate: vi.fn((cb: (nav: { cancel: () => void }) => void) => {
    navigateCallbacks.push(cb);
  }),
  goto: vi.fn(),
}));

// Mock clipboard utility — use $lib alias path to match how the component imports it
vi.mock('$lib/utils/clipboard.js', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

// Mock toast store — $state rune cannot instantiate outside Svelte
vi.mock('$lib/stores/toast.js', () => ({
  toastStore: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    get toasts() { return []; },
  },
}));

import { copyToClipboard } from '$lib/utils/clipboard.js';
import { toastStore } from '$lib/stores/toast.js';
import TokenIssuedModal from '../../src/lib/components/TokenIssuedModal.svelte';

const mockCopy = copyToClipboard as unknown as ReturnType<typeof vi.fn>;
const mockToast = toastStore as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

const SECRET_TOKEN = 'cg_test_abc123_secret_token_value';

const baseProps = {
  open: true,
  plaintext: SECRET_TOKEN,
  onclose: vi.fn(),
};

describe('TokenIssuedModal', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset captured beforeNavigate callbacks between tests
    navigateCallbacks.length = 0;
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Close disabled until checkbox checked
  it('Close button is disabled when modal opens (checkbox not ticked)', () => {
    const { getByRole } = render(TokenIssuedModal, { props: baseProps });
    const closeBtn = getByRole('button', { name: 'Close' });
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.hasAttribute('disabled')).toBe(true);
  });

  // Scenario 2: Checking checkbox enables Close
  it('Ticking "I\'ve saved it" checkbox enables the Close button', async () => {
    const { getByRole, getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const checkbox = getByLabelText(/i've saved it/i);
    expect(checkbox).toBeTruthy();

    await fireEvent.click(checkbox);

    const closeBtn = getByRole('button', { name: 'Close' });
    expect(closeBtn.hasAttribute('disabled')).toBe(false);
  });

  // Scenario 3: Close button click calls onclose
  it('Close button click → onclose called after checkbox is ticked', async () => {
    const onclose = vi.fn();
    const { getByRole, getByLabelText } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);

    const closeBtn = getByRole('button', { name: 'Close' });
    await fireEvent.click(closeBtn);

    expect(onclose).toHaveBeenCalledOnce();
  });

  // Scenario 4: beforeunload handler registered when modal opens
  it('registers beforeunload handler when modal opens', () => {
    render(TokenIssuedModal, { props: baseProps });
    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(beforeUnloadCalls.length).toBeGreaterThan(0);
  });

  // Scenario 5: beforeunload handler removed on close
  it('removes beforeunload handler when modal closes', async () => {
    const onclose = vi.fn();
    const { getByRole, getByLabelText } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);

    const closeBtn = getByRole('button', { name: 'Close' });
    await fireEvent.click(closeBtn);

    const removeBeforeUnloadCalls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(removeBeforeUnloadCalls.length).toBeGreaterThan(0);
  });

  // Scenario 6: beforeunload fires preventDefault when checkbox NOT checked
  it('beforeunload fires preventDefault when checkbox is NOT checked', () => {
    render(TokenIssuedModal, { props: baseProps });

    // Find the registered beforeunload handler
    const call = addEventListenerSpy.mock.calls.find(([event]) => event === 'beforeunload');
    expect(call).toBeTruthy();

    const handler = call![1] as (e: BeforeUnloadEvent) => void;
    const fakeEvent = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    handler(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
  });

  // Scenario 7: beforeunload is removed when checkbox is checked
  it('beforeunload handler is removed immediately when checkbox is checked', async () => {
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });

    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);

    // After checking, removeEventListener should have been called for beforeunload
    const removeBeforeUnloadCalls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(removeBeforeUnloadCalls.length).toBeGreaterThan(0);
  });

  // Scenario 8: Esc key is blocked
  it('Esc key does NOT close the modal (preventDefault called)', async () => {
    const onclose = vi.fn();
    const { container } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    // Modal should still be visible
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(onclose).not.toHaveBeenCalled();
  });

  // Scenario 9: Plaintext is rendered in the modal
  it('renders the plaintext in the modal', () => {
    const { getByText } = render(TokenIssuedModal, { props: baseProps });
    expect(getByText(SECRET_TOKEN)).toBeTruthy();
  });

  // Scenario 10: Copy button calls copyToClipboard
  it('Copy button calls copyToClipboard with the token value', async () => {
    mockCopy.mockResolvedValue(true);
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const copyBtn = getByLabelText('Copy token');
    await fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith(SECRET_TOKEN);
    });
  });

  // Scenario 11: Toast text does NOT contain the token value
  it('success toast text does NOT contain the token value', async () => {
    mockCopy.mockResolvedValue(true);
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const copyBtn = getByLabelText('Copy token');
    await fireEvent.click(copyBtn);

    // handleCopy is async — wait for it to complete
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    });
    const toastMsg = mockToast.success.mock.calls[0]?.[0] as string;
    expect(toastMsg).not.toContain(SECRET_TOKEN);
    expect(toastMsg).toBe('Copied to clipboard');
  });

  // Scenario: Modal does not render when open=false
  it('does not render the modal when open=false', () => {
    const { queryByRole } = render(TokenIssuedModal, {
      props: { ...baseProps, open: false },
    });
    expect(queryByRole('alertdialog')).toBeNull();
  });

  // Scenario 12: beforeNavigate auto-closes modal + zeroes plaintext
  it('beforeNavigate auto-closes modal + zeroes plaintext', async () => {
    const onclose = vi.fn();
    const { queryByRole, queryByText } = render(TokenIssuedModal, {
      props: { ...baseProps, open: true, plaintext: SECRET_TOKEN, onclose },
    });

    // Modal should be visible with plaintext before navigation
    expect(queryByRole('alertdialog')).toBeTruthy();
    expect(queryByText(SECRET_TOKEN)).toBeTruthy();

    // At least one beforeNavigate callback must have been captured
    expect(navigateCallbacks.length).toBeGreaterThan(0);

    // Invoke the captured callback — mimics SvelteKit triggering a navigation event
    navigateCallbacks[0]?.({ cancel: vi.fn() });

    // onclose must have been called by the navigation guard
    expect(onclose).toHaveBeenCalledOnce();

    // After onclose is called, the plaintext chip should no longer show the secret
    // (the production guard zeroes _plaintext before calling onclose)
    await waitFor(() => {
      expect(queryByText(SECRET_TOKEN)).toBeNull();
    });
  });
});
