import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { mkdtempSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { loadConfig, requireMcpUrl } from '../src/config.js';

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


function makeTmpConfig(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-config-'));
  const filePath = path.join(dir, 'config.json');
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('Config Loader', () => {
  // Test 1: Flag wins over env
  test('Scenario 1: flag mcpUrl wins over env CLEARGATE_MCP_URL', () => {
    const cfg = loadConfig({
      flags: { mcpUrl: 'https://flag.example' },
      env: { CLEARGATE_MCP_URL: 'https://env.example' },
    });
    assert.strictEqual(cfg.mcpUrl, 'https://flag.example');
  });

  // Test 2: Env wins over file
  test('Scenario 2: env CLEARGATE_MCP_URL wins over config file mcpUrl', () => {
    const configPath = makeTmpConfig(JSON.stringify({ mcpUrl: 'https://file.example' }));
    const cfg = loadConfig({
      env: { CLEARGATE_MCP_URL: 'https://env.example' },
      configPath,
    });
    assert.strictEqual(cfg.mcpUrl, 'https://env.example');
  });

  // Test 3: File wins over defaults
  test('Scenario 3: config file profile wins over default', () => {
    const configPath = makeTmpConfig(JSON.stringify({ profile: 'prod' }));
    const cfg = loadConfig({ env: {}, configPath });
    assert.strictEqual(cfg.profile, 'prod');
  });

  // Test 4: Defaults apply when nothing set
  test('Scenario 4: defaults apply when nothing is set', () => {
    const cfg = loadConfig({
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    assert.strictEqual(cfg.profile, 'default');
    assert.strictEqual(cfg.logLevel, 'info');
    assert.strictEqual(cfg.mcpUrl, undefined);
  });

  // Test 5: Missing config file is not an error
  test('Scenario 5: missing config file returns defaults without throwing', () => {
    expect(() =>
      loadConfig({ env: {}, configPath: '/nonexistent/path/x.json' }),
    ).not.toThrow();
    const cfg = loadConfig({ env: {}, configPath: '/nonexistent/path/x.json' });
    assert.strictEqual(cfg.profile, 'default');
    assert.strictEqual(cfg.logLevel, 'info');
  });

  // Test 6: Malformed JSON throws with path in message
  test('Scenario 6: malformed JSON in config file throws with file path in message', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-config-'));
    const configPath = path.join(dir, 'config.json');
    writeFileSync(configPath, '{', 'utf8');
    assert.throws(() => loadConfig({ env: {}, configPath }), configPath);
  });

  // Test 7: Unknown key in file throws (zod strict)
  test('Scenario 7: unknown key in config file throws zod strict error', () => {
    const configPath = makeTmpConfig(
      JSON.stringify({ mcpUrl: 'https://x.example', unknown: 1 }),
    );
    assert.throws(() => loadConfig({ env: {}, configPath }));
  });

  // Test 8: Invalid mcpUrl (not a URL) in file throws with field path
  test('Scenario 8: invalid mcpUrl in config file throws zod validation error', () => {
    const configPath = makeTmpConfig(JSON.stringify({ mcpUrl: 'not-a-url' }));
    assert.throws(() => loadConfig({ env: {}, configPath }));
  });

  // Test 9: Invalid logLevel in env throws
  test('Scenario 9: invalid CLEARGATE_LOG_LEVEL in env throws validation error', () => {
    assert.throws(() =>
      loadConfig({
        env: { CLEARGATE_LOG_LEVEL: 'verbose' },
        configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
      }));
  });

  // Test 10: requireMcpUrl throws when mcpUrl is undefined
  test('Scenario 10: requireMcpUrl throws exact message when mcpUrl not configured', () => {
    const cfg = loadConfig({
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    assert.throws(() => requireMcpUrl(cfg), /mcpUrl not configured\. Run `cleargate join <invite-url>` first\./);
  });

  // Test 11: requireMcpUrl returns the string when mcpUrl is set
  test('Scenario 11: requireMcpUrl returns mcpUrl string when configured', () => {
    const cfg = loadConfig({
      flags: { mcpUrl: 'https://mcp.example' },
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    assert.strictEqual(requireMcpUrl(cfg), 'https://mcp.example');
  });
});
