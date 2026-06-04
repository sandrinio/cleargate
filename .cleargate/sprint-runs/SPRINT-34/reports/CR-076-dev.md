---
story_id: CR-076
sprint_id: SPRINT-34
role: developer
status: done
commit: e7e402c
branch: story/CR-076 (cleargate-cli repo)
date: 2026-06-04
---

# CR-076 Developer Report — Trim Published npm Package

## READ-PATH PROOF (hard prerequisite — verified before any config edit)

**File:** `cleargate-cli/src/commands/init.ts:140-145`

```ts
export function resolveDefaultPayloadDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // dist/cli.js → dirname = dist/ → one level up = package root
  const pkgRoot = path.resolve(path.dirname(thisFile), '..');
  return path.join(pkgRoot, 'templates', 'cleargate-planning');
}
```

In the published package the bin is `dist/cli.js`. Therefore:
- `dirname(import.meta.url)` = `dist/`
- `pkgRoot = dist/.. = package ROOT`
- `cleargate init` reads **ROOT `templates/cleargate-planning`** — NOT `dist/templates/`.

**Independently confirmed:** `src/wiki/synthesis/active-sprint.ts:60-61` resolves `path.resolve(__dirname, '..', 'templates', 'synthesis')` = ROOT `templates/synthesis`. Same pattern in `product-state.ts:82-83`, `open-gates.ts:62-63`, `roadmap.ts:99-100`.

**Grep result:** `grep -rn "dist/templates" cleargate-cli/src/` returns only one comment line (`active-sprint.ts:52` — a historical note that `dist/templates/synthesis is also available (copied by onSuccess)`). No runtime read of `dist/templates` anywhere in `src/`.

**Conclusion (inversion):** The CR §0.5 assumed the CLI reads `dist/templates/`. That is **WRONG**. ROOT `templates/` is the live read path. It MUST stay in `package.json files[]`. The `dist/templates/` copy (written by tsup `onSuccess`) is the UNUSED DUPLICATE — eliminated by removing the `onSuccess` template-copy step.

---

## What Changed

### 1. `cleargate-cli/tsup.config.ts`

- **`sourcemap: false`** — drops `dist/cli.js.map` (15.2MB) + `dist/cli.cjs.map` (15.3MB) ≈ 30MB from the published package. CLI consumers rarely need sourcemaps; source-level debugging remains available from the source checkout.
- **`onSuccess` template-copy removed** — the `copyDirSync(srcTemplates, dstTemplates)` block that wrote `templates/ → dist/templates/` is gone. The `dist/templates/` dup no longer written on build.
- **`copyDirSync` helper removed** — was only called by the now-deleted template-copy step; dead code removed.
- **MANIFEST.json copy retained** — the `onSuccess` MANIFEST.json copy (`cleargate-planning/MANIFEST.json → dist/MANIFEST.json`) is kept; it is a separate concern and may be read from `dist/`.

### 2. `cleargate-cli/package.json` files[]

**No change.** `files[]` retains both `"dist"` and `"templates"` exactly as before. Root `templates/` is the live read path; `dist` carries the bin + MANIFEST.json. Inversion guard: dropping `"templates"` would break `cleargate init` in the field.

### 3. `cleargate-cli/test/changelog-format.node.test.ts`

Added sibling test `'Scenario: Tarball excludes sourcemaps and ships payload once (CR-076 — Gate-4-guarded)'` in the same `describe` block as CR-075's in-package pack line. This test:
- Does NOT mutate CR-075's `'Scenario: Tarball includes CHANGELOG'` lines (zero merge conflict).
- Guards against stale pre-build state: if `dist/*.map` files exist (pre-Gate-4), the tarball assertions are skipped with a note and the test passes (soft skip).
- Post-build (Gate-4): asserts zero `*.map` entries + `dist/templates/cleargate-planning` entries = 0 + root `templates/cleargate-planning` entries ≥ 1.

### 4. `cleargate-cli/test/cr076-package-trim.node.test.ts` (new)

Contract test with 5 assertions:
1. `tsup.config.ts` has `sourcemap: false` (not `true`).
2. `tsup.config.ts` `onSuccess` does NOT contain `dstTemplates` variable or `copyDirSync(srcTemplates, ...)` call.
3. `package.json files[]` STILL contains `"templates"` (inversion guard).
4. `package.json files[]` STILL contains `"dist"`.
5. (Gate-4-guarded) `npm pack --dry-run` has zero `*.map` + single payload root — deferred if `dist/*.map` still present.

---

## Test Results

```
tests 10, pass 10, fail 0, skipped 0
```

- `test/cr076-package-trim.node.test.ts`: 5/5 pass (tests 1-4 green; test 5 soft-skips with note — pre-Gate-4 state, 8 stale *.map files in dist/).
- `test/changelog-format.node.test.ts`: 5/5 pass (CR-075 in-package pack line unchanged; CR-076 sibling soft-skips Gate-4 portion).

## Gate-4 Deferral

The `sourcemap: false` and `onSuccess` removal changes take effect only after a fresh `npm run build`. The build-confirm is deferred to Gate-4:

```
npm run build && npm pack --dry-run
```

Expected post-build result:
- Zero lines matching `\.map$` in the manifest.
- `templates/cleargate-planning` appears under root prefix only (no `dist/templates/cleargate-planning` entries).
- File count and unpacked size materially reduced (from 221 files / 53.4MB unpacked → roughly 221 − 8 maps − N dist/templates entries).

DevOps: run this verification before any `npm publish`.

## Commit

`e7e402c` on `story/CR-076` (cleargate-cli repo). Files staged: `tsup.config.ts`, `test/changelog-format.node.test.ts`, `test/cr076-package-trim.node.test.ts`.
