# Node test runner — `*.node.test.ts` convention

**Active 2026-05-04 — SPRINT-21 W4 onward.** New tests must use this convention. Existing `*.test.ts` files (vitest) stay until CR-040 migration in SPRINT-22.

## Why

Vitest's fork-pool overhead + boot cost compounds badly inside agent dispatches. A SPRINT-21 QA dispatch hung for 2.3hr running the full vitest suite (137 files). Node 24's built-in `node:test` runner via `tsx --test` is faster cold-start, no transform overhead, no worker leaks. See feedback memory `feedback_node_test_over_vitest.md`.

## Naming

- Vitest (legacy, 129 files + 4 SPRINT-21-merged): `*.test.ts`
- node:test (new, SPRINT-21 W4+): `*.node.test.ts`

The suffix split lets both runners coexist until CR-040 migrates the legacy surface in one sweep.

## Imports

```ts
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
```

## Running

```bash
# All node:test files
npm run test:node

# Single file (most common — use this from QA dispatches)
npx tsx --test test/lib/example.node.test.ts
# or
npm run test:node:file -- test/lib/example.node.test.ts
```

`tsx --test` runs the file directly with TypeScript transpile on the fly. No `pretest: npm run build` step required for node:test files.

## Assertion translation (vitest → node:assert/strict)

| Vitest | node:assert/strict |
|---|---|
| `expect(x).toBe(y)` | `assert.strictEqual(x, y)` |
| `expect(x).toEqual(y)` | `assert.deepStrictEqual(x, y)` |
| `expect(x).toMatch(/re/)` | `assert.match(x, /re/)` |
| `expect(x).toBeTruthy()` | `assert.ok(x)` |
| `expect(x).toBeNull()` | `assert.strictEqual(x, null)` |
| `expect(x).toContain(y)` | `assert.ok(x.includes(y))` |
| `expect(fn).toThrow()` | `assert.throws(fn)` |
| `expect(fn).rejects.toThrow()` | `await assert.rejects(fn)` |

## Mocking

Prefer **real fixtures + tmpdir** over mocks (project convention: "real infra, no mocks"). When mocking is unavoidable use `node:test`'s built-in `mock`:

```ts
it('uses mock', (t) => {
  const fn = t.mock.fn(() => 42);
  // ...
});
```

Do NOT import `vi` from vitest in `*.node.test.ts` files.

## Hooks

Same names as vitest (`before`/`after`/`beforeEach`/`afterEach`) but imported from `node:test`. Test trees can use nested `describe`.

## Skeleton

```ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('exampleHelper', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cleargate-test-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('does the thing', () => {
    const result = exampleHelper(tmp);
    assert.strictEqual(result, 'expected');
  });
});
```

## QA verification recipe (for dispatch prompts)

```
npx tsx --test test/path/to/new-file.node.test.ts
```

That's it. Do **NOT** run `npm test` (still routes to vitest, full 129-file suite, slow). Only the new file under inspection.
