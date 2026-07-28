---
cr_id: CR-091
parent_ref: EPIC-032
parent_cleargate_id: "EPIC-032"
sprint_cleargate_id: "SPRINT-32"
carry_over: false
status: Completed
approved: true
area: cleargate-cli
context_source: verified codebase grounding (npm delivery audit L1, dead-ness proven by stubbing the require and exercising every command) + recorded direct approval 2026-07-28
created_at: 2026-07-28T00:00:00Z
updated_at: 2026-07-28T00:00:00Z
created_at_version: 0.19.0
updated_at_version: 0.19.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-28T12:51:07Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-091
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-28T12:50:59Z
  sessions: []
---

# CR-091: unbundle the TypeScript compiler; revive the code-map pass

## 0.5 Open Questions

- **Question:** The code-map subsystem is unreachable (no CLI flag in any revision). Delete it, or wire it up?
- **Recommended:** Wire it. EPIC-032 built it deliberately as a general-purpose feature and its 53 tests pass — the only thing missing was the flag. Deleting would discard finished, working work; wiring it makes the bundle saving free of collateral loss.
- **Human decision:** Accepted 2026-07-28 — lazy-load + `external` + register `--code-map`.

- **Question:** Wiring the flag exposed that discovery finds nothing in a single-package repo. Fix now, or ship the flag as-is?
- **Recommended:** Fix. Exposing a flag that silently no-ops on the most common repo shape is worse than not exposing it.
- **Human decision:** Fixed in this CR, gated on `tsconfig.json` so monorepo roots are unaffected.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that the CLI bundle is mostly ClearGate. It was mostly **TypeScript**: ~19.9 MB of unminified compiler, 90% of the published package, inlined because two code-map modules import `typescript` and `wiki-build.ts` imported those at module scope.
- Forget that `--code-map` is a supported flag. It was **never registered in any revision** — `cli.ts` called `wikiBuildHandler()` with no arguments, so `opts.codeMap` could not be true, and the CLI rejected `--code-map` with `unknown option`. The entire EPIC-032 subsystem was unreachable.
- Forget that "the repo root is not a package". That assumption in `discoverPackages` holds only for a monorepo; a single-package repo keeps `tsconfig.json` at the root and was discovered as **zero** packages.

**New Logic (The New Truth):**

- The code-map modules are loaded by dynamic `import()` inside the `opts.codeMap` branch. `typescript` is `external` in `tsup.config.ts` and resolves from the target repo.
- `--code-map` is a registered option on `wiki build`.
- `discoverPackages` counts the repo root as a package when it has a `tsconfig.json`, and only then.
- Absent `typescript`, `--code-map` exits 2 with `npm i -D typescript`. Every other command is untouched.

**The trap, stated once:** the dynamic imports and `external: ['typescript']` are a matched pair. `external` alone, with any static import surviving, hoists the reference to module top level and **every** command dies at load. Warning comments sit in both files.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: [[EPIC-032]] — the code-map awareness layer becomes reachable for the first time; its §6 Q5 note ("flip to default-on at SPRINT-32 close") is now actionable. Default remains **off**.
- [x] Invalidate/Update Story: [[STORY-032-01]] — `discoverPackages` root-package semantics changed.
- [x] Database schema impacts? **No.**
- Consumer-visible: `--code-map` requires `typescript` in the target repo. It is opt-in and exits with a clear instruction, so no existing workflow changes.
- Monorepos are unaffected by the discovery change — verified against this repo's exact shape (root `package.json`, no root `tsconfig.json`, real packages one level down).
- Deferred: `pg` (~14 packages) is still a runtime dependency for the operator-only `bootstrap-root` command; the CJS build of the CLI entry is still produced though no longer published.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:10-13` — four static imports of `../wiki/code-map/*`, the sole reason the compiler entered the bundle. Replaced by dynamic imports inside the `opts.codeMap` branch.
- **Surface:** `cleargate-cli/src/wiki/code-map/scan-source.ts:11` and `cleargate-cli/src/wiki/code-map/extract-skeleton.ts:10` — `import ts from 'typescript'`, the only two `typescript` importers in `src/`.
- **Surface:** `cleargate-cli/src/wiki/code-map/scan-source.ts` — `discoverPackages`, whose walk was seeded from the root's children.
- **Surface:** `cleargate-cli/src/cli.ts:180-184` — the `wiki build` registration that took no options.
- **Surface:** `cleargate-cli/tsup.config.ts` — bundler config; gains `external: ['typescript']`.
- **Why this CR extends rather than rebuilds:** the code-map subsystem, its tests, and the `codeMap` option field all already existed and worked. This changes *when* the modules load and *whether* the flag is reachable — no feature is rewritten.

## Prior work

- [[EPIC-032]] — the code-map awareness layer. Built the subsystem this CR finally exposes.
- [[STORY-032-01]] — package discovery by tsconfig roots; amended here for the root-package case.
- [[CR-090]] — delivery hygiene; dropped the dead CJS twin (−47%). This CR removes the remaining 90%.
- [[CR-076]] — trim the published package (sourcemaps, payload de-dup). Earliest predecessor.
- [[CR-089]] — payload telemetry hygiene.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/wiki-build.ts`
- `cleargate-cli/src/wiki/code-map/scan-source.ts`
- `cleargate-cli/src/cli.ts`
- `cleargate-cli/tsup.config.ts`
- `cleargate-cli/CHANGELOG.md`

**Add:**
- `cleargate-cli/test/wiki/code-map/root-package.node.test.ts`

## 4. Verification Protocol

**Command/Test:** `npm test` — 2237 pass / 0 fail / 1 skipped (up from 2234; +3 root-package cases). `npm run typecheck` clean.

**Bundle:** `dist/cli.js` 10,461,810 B → **494,732 B**. Compiler absence asserted by scanning the bundle for `createSourceFile`, `ts.SyntaxKind`, `getTypeChecker`, `TypeScript Compiler` — all absent.

**Load-path regression (the hoisting trap):** every top-level command exercised against the new binary and byte-compared in behaviour to published 0.18.0 — `init` produces an identical scaffold; `doctor`, `wiki build`, `scaffold-lint` all succeed. (`<cmd> --help` exits 1 on both builds — pre-existing commander behaviour, not a regression.)

**Feature works:** in a single-package fixture, `wiki build --code-map` emits `.cleargate/wiki/code/withts.md` with real extracted symbols and `source_shas`.

**Graceful degradation:** installed the packed tarball into a sandbox with no `typescript` — `--code-map` exits **2** with the install instruction; plain `wiki build` exits **0**; `--version` works.

---

## Context Source

**context_source:** verified codebase grounding — the npm delivery audit proved `--code-map` was never registered (`git log --all -S"'--code-map'"` → zero commits; the CLI answers `unknown option`) and proved the compiler dead by stubbing its require and re-running every command to identical output. The root-package discovery gap was found by running the newly-wired flag against a real single-package fixture and getting zero pages. Direct owner approval recorded 2026-07-28 ("do the cleanup and ship the clean version").

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
