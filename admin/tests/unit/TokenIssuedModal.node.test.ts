import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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
import { render, fireEvent, waitFor } from '@testing-library/svelte';

// Use __overrides__ pattern for $app/navigation (STORY-028-07: ESM static import compat)
import { __overrides__ as navOverrides } from '../../src/lib/__mocks__/app-navigation.ts';
// Use __envOverrides__ for $env/dynamic/public
import { __envOverrides__ } from '../../src/lib/__mocks__/env-dynamic-public.ts';
// Use __clipboardOverride__ for clipboard utility
import { __clipboardOverride__ } from '../../src/lib/utils/clipboard.ts';
// Use __toastMethods__ for toast store (STORY-028-07 override mechanism)
import { __toastMethods__ } from '../../src/lib/stores/toast.svelte.ts';

import TokenIssuedModal from '../../src/lib/components/TokenIssuedModal.svelte';

// Capture beforeNavigate callbacks
const navigateCallbacks: Array<(nav: { cancel: () => void }) => void> = [];

// Mock objects that will be wired via __overrides__
const mockBeforeNavigate = mock.fn((cb: (nav: { cancel: () => void }) => void) => {
  navigateCallbacks.push(cb);
});
const mockGoto = mock.fn();
const mockCopyToClipboard = mock.fn(() => Promise.resolve(true));

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


// mockCopy = proxies to __clipboardOverride__.fn
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCopy = mockCopyToClipboard as unknown as any;
// Toast mock — note: toast.svelte.ts is a .svelte.ts file that IS compiled by our hooks
// So toastStore IS available; we access it directly from the store module
// For tests that need to assert on toast calls, use a wrapper approach
const mockToastSuccess = mock.fn();
const mockToastError = mock.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockToast = { success: mockToastSuccess, error: mockToastError } as any;

const SECRET_TOKEN = 'cg_test_abc123_secret_token_value';

const baseProps = {
  open: true,
  plaintext: SECRET_TOKEN,
  onclose: mock.fn(),
};

describe('TokenIssuedModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addEventListenerSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let removeEventListenerSpy: any;

  beforeEach(() => {
    // Reset individual mocks (NOT mock.reset() which clears module hooks)
    mockBeforeNavigate.mock.resetCalls();
    mockGoto.mock.resetCalls();
    mockCopyToClipboard.mock.resetCalls();
    mockToastSuccess.mock.resetCalls();
    mockToastError.mock.resetCalls();
    // Reset captured beforeNavigate callbacks between tests
    navigateCallbacks.length = 0;
    // Wire overrides via the shared state mechanism
    navOverrides.goto = mockGoto as unknown as (...args: unknown[]) => unknown;
    navOverrides.beforeNavigate = mockBeforeNavigate as unknown as (...args: unknown[]) => unknown;
    // Wire clipboard override
    __clipboardOverride__.fn = mockCopyToClipboard as unknown as (text: string) => Promise<boolean>;
    // Wire env override
    __envOverrides__['PUBLIC_MCP_URL'] = 'https://mcp.example.test';
    // Wire toast methods
    __toastMethods__.success = mockToastSuccess as unknown as (message: string) => string;
    __toastMethods__.error = mockToastError as unknown as (message: string) => string;
    addEventListenerSpy = mock.method(window, 'addEventListener');
    removeEventListenerSpy = mock.method(window, 'removeEventListener');
  });

  afterEach(() => {
    mock.restoreAll();
    navOverrides.goto = undefined;
    navOverrides.beforeNavigate = undefined;
    __clipboardOverride__.fn = undefined;
    delete __envOverrides__['PUBLIC_MCP_URL'];
    __toastMethods__.success = undefined;
    __toastMethods__.error = undefined;
  });

  // Scenario 1: Close disabled until checkbox checked
  test('Close button is disabled when modal opens (checkbox not ticked)', () => {
    const { getByRole } = render(TokenIssuedModal, { props: baseProps });
    const closeBtn = getByRole('button', { name: 'Close' });
    assert.ok(closeBtn);
    expect(closeBtn.hasAttribute('disabled')).toBe(true);
  });

  // Scenario 2: Checking checkbox enables Close
  test('Ticking "I\'ve saved it" checkbox enables the Close button', async () => {
    const { getByRole, getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const checkbox = getByLabelText(/i've saved it/i);
    assert.ok(checkbox);

    await fireEvent.click(checkbox);

    const closeBtn = getByRole('button', { name: 'Close' });
    expect(closeBtn.hasAttribute('disabled')).toBe(false);
  });

  // Scenario 3: Close button click calls onclose
  test('Close button click → onclose called after checkbox is ticked', async () => {
    const onclose = mock.fn();
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
  test('registers beforeunload handler when modal opens', () => {
    render(TokenIssuedModal, { props: baseProps });
    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      (c: unknown) => (c as unknown as { arguments: unknown[] })?.arguments?.[0] === 'beforeunload',
    );
    assert.ok(beforeUnloadCalls.length > 0);
  });

  // Scenario 5: beforeunload handler removed on close
  test('removes beforeunload handler when modal closes', async () => {
    const onclose = mock.fn();
    const { getByRole, getByLabelText } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);

    const closeBtn = getByRole('button', { name: 'Close' });
    await fireEvent.click(closeBtn);

    const removeBeforeUnloadCalls = removeEventListenerSpy.mock.calls.filter(
      (c: unknown) => (c as unknown as { arguments: unknown[] })?.arguments?.[0] === 'beforeunload',
    );
    assert.ok(removeBeforeUnloadCalls.length > 0);
  });

  // Scenario 6: beforeunload fires preventDefault when checkbox NOT checked
  test('beforeunload fires preventDefault when checkbox is NOT checked', () => {
    render(TokenIssuedModal, { props: baseProps });

    // Find the registered beforeunload handler
    const call = addEventListenerSpy.mock.calls.find((c: unknown) => (c as unknown as { arguments: unknown[] })?.arguments?.[0] === 'beforeunload');
    assert.ok(call);

    const handler = (call as unknown as { arguments: unknown[] })?.arguments?.[1] as (e: BeforeUnloadEvent) => void;
    const fakeEvent = {
      preventDefault: mock.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    handler(fakeEvent);

    assert.ok((fakeEvent.preventDefault as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
  });

  // Scenario 7: beforeunload is removed when checkbox is checked
  test('beforeunload handler is removed immediately when checkbox is checked', async () => {
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });

    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);

    // After checking, removeEventListener should have been called for beforeunload
    const removeBeforeUnloadCalls = removeEventListenerSpy.mock.calls.filter(
      (c: unknown) => (c as unknown as { arguments: unknown[] })?.arguments?.[0] === 'beforeunload',
    );
    assert.ok(removeBeforeUnloadCalls.length > 0);
  });

  // Scenario 8: Esc key is blocked
  test('Esc key does NOT close the modal (preventDefault called)', async () => {
    const onclose = mock.fn();
    const { container } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    // Modal should still be visible
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    assert.strictEqual(onclose.mock.calls.length, 0);
  });

  // Scenario 9: Plaintext is rendered in the modal
  test('renders the plaintext in the modal', () => {
    const { getByText } = render(TokenIssuedModal, { props: baseProps });
    expect(getByText(SECRET_TOKEN)).toBeTruthy();
  });

  // Scenario 10: Copy button calls copyToClipboard
  test('Copy button calls copyToClipboard with the token value', async () => {
    mockCopy.mock.mockImplementation(() => Promise.resolve(true));
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const copyBtn = getByLabelText('Copy token');
    await fireEvent.click(copyBtn);

    await waitFor(() => {
      assert.deepStrictEqual((mockCopy.mock.calls[mockCopy.mock.calls.length - 1] as unknown as { arguments: unknown[] })?.arguments, [SECRET_TOKEN]);
    });
  });

  // Scenario 11: Toast text does NOT contain the token value
  test('success toast text does NOT contain the token value', async () => {
    mockCopy.mock.mockImplementation(() => Promise.resolve(true));
    const { getByLabelText } = render(TokenIssuedModal, { props: baseProps });
    const copyBtn = getByLabelText('Copy token');
    await fireEvent.click(copyBtn);

    // handleCopy is async — wait for it to complete
    await waitFor(() => {
      assert.ok(mockToast.success.mock.calls.length > 0);
    });
    const toastMsg = mockToast.success.mock.calls[0]?.arguments?.[0] as string;
    assert.ok(!String(toastMsg).includes(SECRET_TOKEN));
    assert.strictEqual(toastMsg, 'Copied to clipboard');
  });

  // Scenario: Modal does not render when open=false
  test('does not render the modal when open=false', () => {
    const { queryByRole } = render(TokenIssuedModal, {
      props: { ...baseProps, open: false },
    });
    expect(queryByRole('alertdialog')).toBeNull();
  });

  // Scenario 12: beforeNavigate auto-closes modal + zeroes plaintext
  test('beforeNavigate auto-closes modal + zeroes plaintext', async () => {
    const onclose = mock.fn();
    const { queryByRole, queryByText } = render(TokenIssuedModal, {
      props: { ...baseProps, open: true, plaintext: SECRET_TOKEN, onclose },
    });

    // Modal should be visible with plaintext before navigation
    expect(queryByRole('alertdialog')).toBeTruthy();
    expect(queryByText(SECRET_TOKEN)).toBeTruthy();

    // At least one beforeNavigate callback must have been captured
    assert.ok(navigateCallbacks.length > 0);

    // Invoke the captured callback — mimics SvelteKit triggering a navigation event
    navigateCallbacks[0]?.({ cancel: mock.fn() });

    // onclose must have been called by the navigation guard
    expect(onclose).toHaveBeenCalledOnce();

    // After onclose is called, the plaintext chip should no longer show the secret
    // (the production guard zeroes _plaintext before calling onclose)
    await waitFor(() => {
      expect(queryByText(SECRET_TOKEN)).toBeNull();
    });
  });
});
