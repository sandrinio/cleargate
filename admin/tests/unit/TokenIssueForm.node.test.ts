import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * TokenIssueForm unit tests — STORY-006-05
 *
 * Scenarios:
 *   1. Name validation: "ab" (2 chars) shows error, POST not called
 *   2. Name validation: 80-char name is valid (boundary)
 *   3. Name validation: 81-char name shows error, POST not called
 *   4. Member select is populated from memberOptions prop
 *   5. Submit calls mcpClient.post with correct payload shape (name, member_id, expires_at)
 *   6. Expiration radio defaults to 30d
 *   7. "Never" expiration omits expires_at from body
 *   8. onissued callback is called with the server response
 *   9. Server error shows inline retry banner; onissued NOT called
 *  10. Schema drift (empty token field) shows error; onissued NOT called
 */
import { render, fireEvent, waitFor } from '@testing-library/svelte';
// mcp-client is mocked via hooks (src/lib/__mocks__/mcp-client.ts)
import { __mockFns__ as mcpMockFns } from '../../src/lib/__mocks__/mcp-client.ts';

import TokenIssueForm from '../../src/lib/components/TokenIssueForm.svelte';

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


// Wire mockPost to the shared __mockFns__ state so the mocked mcp-client uses it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPost = mock.fn<(...args: any[]) => any>();
mcpMockFns.post = mockPost as unknown as (...args: unknown[]) => unknown;

const mockMemberOptions = [
  { id: 'mem-001', email: 'alice@example.com' },
  { id: 'mem-002', email: 'bob@example.com' },
];

const mockTokenIssued = {
  id: 'tok-123',
  member_id: 'mem-001',
  name: 'ci-bot',
  created_at: new Date().toISOString(),
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
  token: 'cg_plaintext_abc123',
};

const baseProps = {
  open: true,
  projectId: 'proj-abc',
  memberOptions: mockMemberOptions,
  onissued: mock.fn(),
  onclose: mock.fn(),
};

describe('TokenIssueForm', () => {
  beforeEach(() => {
    mockPost.mock.resetCalls();
    // Re-wire after reset
    mcpMockFns.post = mockPost as unknown as (...args: unknown[]) => unknown;
  });

  // Scenario 1: Short name shows error
  test('name "ab" (2 chars) shows validation error and POST is not called', async () => {
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'ab' } });

    // Use getByRole to disambiguate from the heading
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/3-80 characters/i)).toBeTruthy();
    });
    assert.strictEqual(mockPost.mock.calls.length, 0);
  });

  // Scenario 2: 80-char name is valid (boundary)
  test('name with exactly 80 chars passes validation', async () => {
    mockPost.mock.mockImplementation(() => Promise.resolve(mockTokenIssued));
    const { getByLabelText, getByRole } = render(TokenIssueForm, { props: baseProps });

    const name80 = 'a'.repeat(80);
    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: name80 } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      assert.ok(mockPost.mock.calls.length > 0);
    });
  });

  // Scenario 3: 81-char name shows error
  test('name with 81 chars shows validation error', async () => {
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, { props: baseProps });

    const name81 = 'a'.repeat(81);
    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: name81 } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/3-80 characters/i)).toBeTruthy();
    });
    assert.strictEqual(mockPost.mock.calls.length, 0);
  });

  // Scenario 4: Member select is populated
  test('member select is populated from memberOptions', () => {
    const { getByLabelText } = render(TokenIssueForm, { props: baseProps });
    const select = getByLabelText(/member/i) as HTMLSelectElement;
    assert.ok(select);
    assert.strictEqual(select.options.length, 2);
    assert.strictEqual(select.options[0]!.text, 'alice@example.com');
    assert.strictEqual(select.options[1]!.text, 'bob@example.com');
  });

  // Scenario 5: Submit calls post with correct payload
  test('submit calls mcpClient.post with { member_id, name, expires_at }', async () => {
    mockPost.mock.mockImplementation(() => Promise.resolve(mockTokenIssued));
    const { getByLabelText, getByRole } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'ci-bot' } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      assert.ok(mockPost.mock.calls.length > 0);
    });

    const [path, body] = mockPost.mock.calls[0]?.arguments as [string, Record<string, unknown>];
    assert.strictEqual(path, '/projects/proj-abc/tokens');
    assert.strictEqual(body.name, 'ci-bot');
    assert.strictEqual(body.member_id, 'mem-001'); // first option selected by default
    // 30d default means expires_at should be present
    assert.notStrictEqual(body.expires_at, undefined);
  });

  // Scenario 6: Default expiry is 30d
  test('expiration radio defaults to 30 days', () => {
    const { container } = render(TokenIssueForm, { props: baseProps });
    const radios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const checked = Array.from(radios).find((r) => r.checked);
    assert.ok(checked);
    assert.strictEqual(checked!.value, '30d');
  });

  // Scenario 7: "Never" expiration omits expires_at
  test('"Never" expiration sends body without expires_at', async () => {
    mockPost.mock.mockImplementation(() => Promise.resolve(mockTokenIssued));
    const { getByLabelText, getByRole, container } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'never-bot' } });

    // Select "Never" radio
    const radios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const neverRadio = Array.from(radios).find((r) => r.value === 'never');
    assert.ok(neverRadio);
    await fireEvent.click(neverRadio!);

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      assert.ok(mockPost.mock.calls.length > 0);
    });

    const [, body] = mockPost.mock.calls[0]?.arguments as [string, Record<string, unknown>];
    assert.strictEqual(body.expires_at, undefined);
  });

  // Scenario 8: onissued is called with server response
  test('onissued callback is called with the full server response', async () => {
    mockPost.mock.mockImplementation(() => Promise.resolve(mockTokenIssued));
    const onissued = mock.fn();
    const { getByLabelText, getByRole } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'test-token' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      assert.deepStrictEqual((onissued.mock.calls[onissued.mock.calls.length - 1] as unknown as { arguments: unknown[] })?.arguments, [mockTokenIssued]);
    });
  });

  // Scenario 9: Server error shows retry banner; onissued not called
  test('server error shows inline retry banner and onissued is NOT called', async () => {
    mockPost.mock.mockImplementation(() => Promise.reject(new Error('Internal server error')));
    const onissued = mock.fn();
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'failing-bot' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/internal server error/i)).toBeTruthy();
    });
    assert.strictEqual(onissued.mock.calls.length, 0);
  });

  // Scenario 10: Schema drift guard — empty token triggers error
  test('schema drift guard: empty token field shows error and onissued is NOT called', async () => {
    // Empty string triggers the guard: if (!result.token) throw ...
    mockPost.mock.mockImplementation(() => Promise.resolve({ ...mockTokenIssued, token: '' }));
    const onissued = mock.fn();

    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'drift-bot' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/schema drift/i)).toBeTruthy();
    });
    assert.strictEqual(onissued.mock.calls.length, 0);
  });
});
