import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for InviteModal component — STORY-006-04
 *
 * Scenarios covered:
 *   - Form phase renders when modal opens
 *   - Submit button is disabled when email is empty (validation)
 *   - Submit button is disabled when email is malformed
 *   - Submit button is enabled with valid email
 *   - POST is called with { email, role } on submit (mocked)
 *   - On success, modal switches to URL phase and shows invite_url
 *   - URL phase shows a Copy button
 *   - No "Resend invite" button exists (per orchestrator decision)
 *   - On 409, inline error "Already a member" is shown
 */
import { render, fireEvent, waitFor } from '@testing-library/svelte';
// mcp-client is mocked via hooks (src/lib/__mocks__/mcp-client.ts)
// Use __mockFns__ to control per-test behavior
import { __mockFns__ as mcpMockFns } from '../../src/lib/__mocks__/mcp-client.ts';

import InviteModal from '../../src/lib/components/InviteModal.svelte';

// Create a proxy that captures calls via the shared __mockFns__ state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPost = mock.fn<(...args: any[]) => any>();
// Wire mockPost to __mockFns__.post so components that call post() use our mock
mcpMockFns.post = mockPost as unknown as (...args: unknown[]) => unknown;

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


// mockPost is already defined above as the mock function passed to mock.module

const baseProps = {
  open: true,
  onclose: () => {},
  projectId: 'proj-123',
  projectName: 'Test Project',
};

const mockInviteResponse = {
  member: {
    id: 'mem-1',
    project_id: 'proj-123',
    email: 'alice@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
    status: 'pending',
    display_name: null,
  },
  invite_url: 'https://mcp.cleargate.example/join/abc123',
  invite_token: 'abc123',
  invite_expires_in: 86400,
};

describe('InviteModal', () => {
  beforeEach(() => {
    mockPost.mock.resetCalls();
  });

  test('renders email + role form on open', () => {
    const { getByLabelText } = render(InviteModal, { props: baseProps });
    expect(getByLabelText('Email address')).toBeTruthy();
    expect(getByLabelText('Role')).toBeTruthy();
  });

  test('submit button is disabled when email is empty', () => {
    const { getByText } = render(InviteModal, { props: baseProps });
    const btn = getByText('Send invite') as HTMLButtonElement;
    assert.strictEqual(btn.disabled, true);
  });

  test('submit button is disabled when email is malformed', async () => {
    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'not-an-email' } });
    const btn = getByText('Send invite') as HTMLButtonElement;
    assert.strictEqual(btn.disabled, true);
  });

  test('submit button is enabled with valid email', async () => {
    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });
    const btn = getByText('Send invite') as HTMLButtonElement;
    assert.strictEqual(btn.disabled, false);
  });

  test('calls POST with { email, role } on submit', async () => {
    mockPost.mock.mockImplementationOnce(() => Promise.resolve(mockInviteResponse));

    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      assert.ok(mockPost.mock.calls.length > 0, 'mockPost was not called');
      const lastCall = mockPost.mock.calls[mockPost.mock.calls.length - 1] as unknown as { arguments: unknown[] };
      assert.strictEqual(lastCall?.arguments?.[0], '/projects/proj-123/members');
      assert.deepStrictEqual(lastCall?.arguments?.[1], { email: 'alice@example.com', role: 'user' });
    });
  });

  test('switches to URL phase and shows invite_url on success', async () => {
    mockPost.mock.mockImplementationOnce(() => Promise.resolve(mockInviteResponse));

    const { getByLabelText, getByDisplayValue } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(getByDisplayValue('https://mcp.cleargate.example/join/abc123')).toBeTruthy();
    });
  });

  test('shows Copy button in URL phase', async () => {
    mockPost.mock.mockImplementationOnce(() => Promise.resolve(mockInviteResponse));

    const { getByLabelText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(getByLabelText('Copy invite URL')).toBeTruthy();
    });
  });

  test('shows inline error "Already a member" on 409', async () => {
    const err = Object.assign(new Error('409'), { status: 409 });
    mockPost.mock.mockImplementationOnce(() => Promise.reject(err));

    const { getByLabelText, findByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    const errMsg = await findByText('Already a member of this project');
    assert.ok(errMsg);
  });

  test('has NO resend invite button (per orchestrator decision)', () => {
    const { queryByText } = render(InviteModal, { props: baseProps });
    // Neither in form phase nor URL phase should a "Resend" button exist
    expect(queryByText(/resend/i)).toBeNull();
  });
});
