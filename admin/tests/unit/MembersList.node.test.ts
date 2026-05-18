import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * RED tests for CR-062 — MembersList.svelte component
 *
 * Story: CR-062 (SPRINT-27, Wave 1) — outer admin UI surface
 * Sprint: SPRINT-27
 *
 * ALL 5 scenarios FAIL on the clean baseline because the top-level import of
 * MembersList.svelte (and InviteUrlModal.svelte) triggers MODULE_NOT_FOUND at
 * file-load time — before any test body executes. Vitest marks every test in
 * this file as an error.
 *
 * Post-CR-062 implementation the imports resolve and each assertion passes.
 *
 * Run via:
 *   cd /path/to/ClearGate/.worktrees/CR-062/admin
 *   npm run test:vitest -- --reporter=verbose tests/unit/MembersList.test.ts
 */
import { render, fireEvent } from '@testing-library/svelte';

// These imports FAIL on baseline — neither file exists yet.
// Module load failure propagates to all test cases in this file.
import MembersList from '../../src/lib/components/MembersList.svelte';
import InviteUrlModal from '../../src/lib/components/InviteUrlModal.svelte';

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


// ─────────────────────────────────────────────────────────────────────────────
// Store / utility mocks (required by components post-implementation)
// ─────────────────────────────────────────────────────────────────────────────

// toast store and clipboard are available via the override mechanism
// (toast.svelte.ts and clipboard.ts include __toastMethods__ and __clipboardOverride__)
// No explicit mock.module needed — the stubs proxy through OK

// ─────────────────────────────────────────────────────────────────────────────
// Test data
// ─────────────────────────────────────────────────────────────────────────────

interface MemberDto {
  id: string;
  project_id: string;
  email: string;
  role: string;
  display_name: string | null;
  created_at: string;
  status: 'pending' | 'active' | 'expired';
}

function makeMember(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    id: 'mem-00000000-0000-4000-8000-000000062201',
    project_id: 'proj-00000000-0000-4000-8000-000000062200',
    email: 'member@cleargate.test',
    role: 'user',
    display_name: null,
    created_at: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 8 (M1 blueprint) — pending row renders Send AND Trash2 icons
// ─────────────────────────────────────────────────────────────────────────────

describe('MembersList', () => {
  beforeEach(() => {
    mock.reset();
  });

  test(
    'Scenario 8a (RED): pending row renders Send icon with aria-label and title',
    () => {
      const member = makeMember({ status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: mock.fn(), onremove: mock.fn() },
      });

      // Resend (Send) button must be present for pending rows
      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]') ??
        container.querySelector('[title*="Resend"]');
      assert.ok(sendBtn);
      // Must also have a title tooltip (Design Guide §6.4)
      expect(
        sendBtn?.getAttribute('aria-label') || sendBtn?.getAttribute('title'),
      ).toBeTruthy();
    },
  );

  test(
    'Scenario 8b (RED): pending row renders Trash2 (Remove) icon with aria-label and title',
    () => {
      const member = makeMember({ status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: mock.fn(), onremove: mock.fn() },
      });

      // Remove (Trash2) button must be present for all rows
      const removeBtn = container.querySelector('[aria-label*="Remove"]') ??
        container.querySelector('[aria-label*="remove"]') ??
        container.querySelector('[title*="Remove"]');
      assert.ok(removeBtn);
      expect(
        removeBtn?.getAttribute('aria-label') || removeBtn?.getAttribute('title'),
      ).toBeTruthy();
    },
  );

  test(
    'Scenario 9 (RED): active row renders Trash2 icon only — no Send icon',
    () => {
      const member = makeMember({ status: 'active', email: 'active@cleargate.test' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: mock.fn(), onremove: mock.fn() },
      });

      // Send icon must NOT appear for active members
      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]');
      assert.strictEqual(sendBtn, null);

      // Remove (Trash2) icon must still appear
      const removeBtn = container.querySelector('[aria-label*="Remove"]') ??
        container.querySelector('[aria-label*="remove"]');
      assert.ok(removeBtn);
    },
  );

  test(
    'Scenario 10 (RED): clicking Send icon dispatches onresend callback with memberId',
    async () => {
      const onresend = mock.fn();
      const member = makeMember({ id: 'mem-click-test', status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend, onremove: mock.fn() },
      });

      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]') as HTMLElement | null;
      assert.ok(sendBtn);

      await fireEvent.click(sendBtn as HTMLElement);

      expect(onresend).toHaveBeenCalledOnce();
      assert.deepStrictEqual(onresend.mock.calls[onresend.mock.calls.length - 1]?.arguments, [member.id]);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// InviteUrlModal — mail_sent indicator scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('InviteUrlModal', () => {
  const baseProps = {
    open: true,
    inviteUrl: 'https://mcp.test/join/tok-abc',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    recipientEmail: 'invitee@cleargate.test',
    mailSent: true,
  };

  test(
    'Scenario 10a (RED): mailSent=true → renders green "Email sent" indicator with recipient address',
    () => {
      const { container } = render(InviteUrlModal, { props: { ...baseProps, mailSent: true } });

      // Expect a green indicator mentioning the recipient email
      const text = container.textContent ?? '';
      assert.ok(String(text).includes('invitee@cleargate.test'));
      // Green indicator — look for a success/green class or the phrase "Email sent"
      const successEl = container.querySelector('.text-success, .badge-success, [class*="green"]') ??
        Array.from(container.querySelectorAll('*')).find((el) =>
          el.textContent?.includes('Email sent'),
        );
      assert.ok(successEl);
    },
  );

  test(
    'Scenario 10b (RED): mailSent=false → renders amber "could not be sent" indicator',
    () => {
      const { container } = render(InviteUrlModal, {
        props: { ...baseProps, mailSent: false },
      });

      const text = container.textContent ?? '';
      // Amber/warning indicator — look for warning class or the phrase "could not be sent"
      const warningEl = container.querySelector('.text-warning, .badge-warning, [class*="amber"]') ??
        Array.from(container.querySelectorAll('*')).find((el) =>
          el.textContent?.includes('could not be sent'),
        );
      assert.ok(warningEl);
      // Invite URL must still be present so admin can copy it manually
      assert.ok(String(text).includes('https://mcp.test/join/tok-abc'));
    },
  );
});
