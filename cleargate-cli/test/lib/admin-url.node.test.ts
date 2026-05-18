import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * admin-url.test.ts — STORY-023-04
 *
 * Tests every Gherkin scenario for the admin-url helper.
 * All tests inject `env` and `configReader` seams — no filesystem access.
 */


import { adminUrl } from '../../src/lib/admin-url.js';

// ─── Scenario 1: Default URL returned when no env var or config ───────────────

describe('adminUrl — Scenario 1: default URL when env+config absent', () => {
  test('returns the default base URL when CLEARGATE_ADMIN_URL is unset and config has no project_id', () => {
    const result = adminUrl(undefined, {
      env: {},
      configReader: () => ({}),
    });
    assert.strictEqual(result, 'https://admin.cleargate.soula.ge/');
  });
});

// ─── Scenario 2: Env var overrides default base ───────────────────────────────

describe('adminUrl — Scenario 2: env var overrides default base', () => {
  test('returns the env-var URL when CLEARGATE_ADMIN_URL is set (already has trailing slash)', () => {
    const result = adminUrl(undefined, {
      env: { CLEARGATE_ADMIN_URL: 'https://my-admin.example.com/' },
      configReader: () => ({}),
    });
    assert.strictEqual(result, 'https://my-admin.example.com/');
  });
});

// ─── Scenario 3: Env var trailing slash is normalised ─────────────────────────

describe('adminUrl — Scenario 3: trailing-slash normalisation', () => {
  test('appends a trailing slash when CLEARGATE_ADMIN_URL has no trailing slash', () => {
    const result = adminUrl(undefined, {
      env: { CLEARGATE_ADMIN_URL: 'https://my-admin.example.com' },
      configReader: () => ({}),
    });
    assert.strictEqual(result, 'https://my-admin.example.com/');
  });
});

// ─── Scenario 4: project_id in config appends project path ───────────────────

describe('adminUrl — Scenario 4: project_id in config appends /projects/<id>', () => {
  test('appends /projects/<project_id> when config returns a project_id and no explicit path given', () => {
    const result = adminUrl(undefined, {
      env: {},
      configReader: () => ({ project_id: 'proj-abc-123' }),
    });
    assert.strictEqual(result, 'https://admin.cleargate.soula.ge/projects/proj-abc-123');
  });
});

// ─── Scenario 5: Explicit path argument overrides project suffix ──────────────

describe('adminUrl — Scenario 5: explicit path argument overrides project suffix', () => {
  test('uses the explicit path and ignores project_id from config', () => {
    const result = adminUrl('/items', {
      env: {},
      configReader: () => ({ project_id: 'proj-abc-123' }),
    });
    assert.strictEqual(result, 'https://admin.cleargate.soula.ge/items');
  });
});

// ─── Scenario 6: Config read failure falls back silently ─────────────────────

describe('adminUrl — Scenario 6: config read failure falls back silently', () => {
  test('returns the default base URL when configReader throws, without rethrowing', () => {
    let threwOutside = false;
    let result: string;

    try {
      result = adminUrl(undefined, {
        env: {},
        configReader: () => {
          throw new Error('ENOENT: no such file or directory');
        },
      });
    } catch {
      threwOutside = true;
      result = '';
    }

    assert.strictEqual(threwOutside, false);
    assert.strictEqual(result!, 'https://admin.cleargate.soula.ge/');
  });

  test('returns the default base URL when configReader throws a JSON parse error', () => {
    let threwOutside = false;
    let result: string;

    try {
      result = adminUrl(undefined, {
        env: {},
        configReader: () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });
    } catch {
      threwOutside = true;
      result = '';
    }

    assert.strictEqual(threwOutside, false);
    assert.strictEqual(result!, 'https://admin.cleargate.soula.ge/');
  });
});

// ─── Scenario 7: cleargate sync prints admin URL on success ──────────────────
// NOTE: The full end-to-end test (cleargate sync stdout check) belongs to
// STORY-023-01's test suite which wires adminUrl into sync.ts. This scenario
// is covered here by verifying the helper's output matches the expected stdout
// fragment that STORY-023-01 will assert.

describe('adminUrl — Scenario 7: sync output template produces expected line', () => {
  test('produces the expected "→ View synced items:" line when composed with default URL', () => {
    const url = adminUrl(undefined, {
      env: {},
      configReader: () => ({}),
    });
    const outputLine = `→ View synced items: ${url}`;
    assert.strictEqual(outputLine, '→ View synced items: https://admin.cleargate.soula.ge/');
  });
});
