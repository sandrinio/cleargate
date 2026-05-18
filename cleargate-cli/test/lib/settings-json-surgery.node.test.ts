import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import type { ClaudeSettings } from '../../src/lib/settings-json-surgery.js';
import { removeClearGateHooks, hasClearGateHooks } from '../../src/lib/settings-json-surgery.js';

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
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
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
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


// ---- helpers ----------------------------------------------------------------

function cgSubagentStop(command = '/Users/foo/.claude/hooks/token-ledger.sh'): ClaudeSettings {
  return {
    hooks: {
      SubagentStop: [
        {
          hooks: [{ type: 'command', command }],
        },
      ],
    },
  };
}

function userSubagentStop(): ClaudeSettings['hooks'] {
  return {
    SubagentStop: [
      {
        hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
      },
    ],
  };
}

// ---- removeClearGateHooks ---------------------------------------------------

describe('removeClearGateHooks', () => {
  test('strips only ClearGate hooks, preserves user SubagentStop hook', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command:
                  'FILE=$(jq -r \'.tool_input.file_path\'); case "$FILE" in *.cleargate/delivery/*) node /usr/local/lib/node_modules/cleargate/dist/cli.js wiki ingest "$FILE" ;; esac',
              },
            ],
          },
        ],
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);

    // PostToolUse had only ClearGate hooks — should be gone
    assert.strictEqual(result.hooks?.PostToolUse, undefined);

    // User SubagentStop hook must remain
    assert.notStrictEqual(result.hooks?.SubagentStop, undefined);
    assert.strictEqual((result.hooks?.SubagentStop).length, 1);
    assert.strictEqual(result.hooks!.SubagentStop![0].hooks![0].command, '/Users/foo/my-custom-hook.sh');
  });

  test('preserves all other top-level keys', () => {
    const settings: ClaudeSettings = {
      other: { foo: 'bar' },
      hooks: {
        SubagentStop: [
          {
            hooks: [
              {
                type: 'command',
                command: '/Users/foo/.claude/hooks/token-ledger.sh',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    assert.deepStrictEqual(result.other, { foo: 'bar' });
  });

  test('is a no-op when no ClearGate hooks are present', () => {
    const settings: ClaudeSettings = {
      hooks: {
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    // Deep equality — no ClearGate hooks to remove, result mirrors input structure
    expect(JSON.stringify(result)).toBe(JSON.stringify(settings));
  });

  test('cleargate-*.sh wildcard catches future ClearGate hooks', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: '/Users/foo/.claude/hooks/cleargate-future.sh',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    assert.strictEqual(result.hooks?.PostToolUse, undefined);
  });

  test('removes empty PostToolUse array after last ClearGate entry is removed', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/.claude/hooks/token-ledger.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    // Key must be deleted entirely (not set to [])
    assert.strictEqual(result.hooks?.PostToolUse, undefined);
  });

  test('removes only matching inner hooks when HookEntry mixes ClearGate + user commands', () => {
    const settings: ClaudeSettings = {
      hooks: {
        SubagentStop: [
          {
            hooks: [
              { type: 'command', command: '/Users/foo/.claude/hooks/token-ledger.sh' },
              { type: 'command', command: '/Users/foo/my-custom-hook.sh' },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    const entry = result.hooks?.SubagentStop?.[0];
    assert.notStrictEqual(entry, undefined);
    assert.strictEqual((entry!.hooks).length, 1);
    assert.strictEqual(entry!.hooks![0].command, '/Users/foo/my-custom-hook.sh');
  });

  test('matches stamp-and-gate.sh', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/stamp-and-gate.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  test('matches session-start.sh', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/session-start.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  test('matches wiki-ingest.sh (legacy)', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/wiki-ingest.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  test('matches inline wiki ingest command (SPRINT-04 legacy PostToolUse)', () => {
    // This reproduces the actual .claude/settings.json inline command format
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command:
                  'FILE=$(jq -r \'.tool_input.file_path\'); case "$FILE" in *.cleargate/delivery/*) node /usr/local/dist/cli.js wiki ingest "$FILE" >> /path/to/log 2>&1 ;; esac',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    assert.strictEqual(result.hooks?.PostToolUse, undefined);
  });
});

// ---- hasClearGateHooks ------------------------------------------------------

describe('hasClearGateHooks', () => {
  test('returns true when a ClearGate hook is present', () => {
    const settings = cgSubagentStop();
    expect(hasClearGateHooks(settings)).toBe(true);
  });

  test('returns false when no ClearGate hooks are present', () => {
    const settings: ClaudeSettings = {
      hooks: userSubagentStop(),
    };
    expect(hasClearGateHooks(settings)).toBe(false);
  });

  test('returns false when hooks key is absent', () => {
    const settings: ClaudeSettings = { other: 'value' };
    expect(hasClearGateHooks(settings)).toBe(false);
  });
});
