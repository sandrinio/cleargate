---
bug_id: BUG-037
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: sandrinio
approved: true
area: cli
context_source: verified codebase grounding — reproduced end-to-end in a clean throwaway repo against published cleargate 0.19.0 → 0.20.0; before/after values read out of gate-checks.json
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T19:57:24Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-037
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T19:57:24Z
  sessions: []
---

# BUG-037: `cleargate upgrade` Silently Blanks the Gate Commands That `init` Detected

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `cleargate init` detects the target repo's test stack and writes the real commands into `.cleargate/scripts/gate-checks.json` (`qa.typecheck`, `qa.test`, `arch.typecheck`). `cleargate upgrade` moves the scaffold forward without discarding that per-repo detection.

**Actual Behavior:** `gate-checks.json` carries `overwrite_policy: "always"` and the shipped payload has those three fields **empty**. Every `cleargate upgrade` therefore overwrites the detected commands with `""`, silently. The only output is one line saying the file was overwritten; nothing says configuration was in it.

After an upgrade, the QA gate's typecheck and test commands are empty strings. The gate that exists to run the repo's tests stops naming any tests to run.

## 2. Reproduction Protocol

Deterministic, from a clean directory. Reproduced exactly as written against published `cleargate@0.19.0` → `0.20.0`:

1. `mkdir repro && cd repro && git init`
2. Write a `package.json` with a detectable stack:
   ```json
   { "name": "repro", "type": "module",
     "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit" },
     "devDependencies": { "vitest": "^2.0.0", "typescript": "^5.8.0" } }
   ```
3. `npm i -D cleargate@0.19.0 && npx cleargate init`
   **Observe:** `[cleargate init] Test stack: vitest run`
4. Read the detected values:
   ```
   qa.typecheck   = npm run typecheck
   qa.test        = vitest run
   arch.typecheck = npm run typecheck
   ```
5. `npm i -D cleargate@0.20.0 && npx cleargate upgrade --yes`
   **Observe:** `[always] overwritten: .cleargate/scripts/gate-checks.json`
6. Read the values again:
   ```
   qa.typecheck   =
   qa.test        =
   ```

Step 6 is the bug. No prompt, no warning, no diff — and `--dry-run` reports it only as a routine `action=overwrite`, indistinguishable from the 60-odd files where overwriting is correct.

## 3. Evidence & Context

The payload ships the fields empty, which is correct for a template — they are meant to be filled by detection:

```
$ python3 -c "import json; d=json.load(open('node_modules/cleargate/templates/cleargate-planning/.cleargate/scripts/gate-checks.json')); print(repr(d['qa']['test']))"
''
```

And the manifest classifies the file as pure payload:

```
$ grep -A 4 'gate-checks.json' .cleargate/.install-manifest.json
  "path": ".cleargate/scripts/gate-checks.json",
  "overwrite_policy": "always",
```

`overwrite_policy: always` means "silent overwrite with package content". That is the right policy for a file the user never customises, and the wrong policy for a file **the installer itself writes into**. `src/init/detect-test-stack.ts:148` rewrites exactly this file:

```
 *   - .cleargate/scripts/gate-checks.json  (rewrites qa.typecheck, qa.test, arch.typecheck)
```

So `init` treats it as generated-per-repo and `upgrade` treats it as static payload. Both cannot be right.

### Secondary finding: the install manifest records a sha the file never has

Same root cause, smaller blast radius. `init` copies `gate-checks.json` from the payload, records the **payload's** sha in `.install-manifest.json`, then `detect-test-stack` rewrites the file. The recorded sha is therefore stale from the moment init finishes — even in a repo where detection finds nothing, because the rewrite re-serialises the JSON with different array formatting.

Measured on a fresh install with no user edits at all:

```
manifest sha: fa8e2af31c709a589ae73a8ebfa6719120f32589d34cfca76ca1e8836d10461f
on-disk sha : 7d967208a434a8c7418053187aefc61ddb453b60fd47bd0f2d3f56df889c5fc3
```

Consequence: every fresh install reports one permanently `user-modified` file, visible in `upgrade --dry-run` as `state=user-modified → clean`. Drift detection carries a false positive from minute zero, which is corrosive to a mechanism whose whole value is being trusted. (Content there was semantically identical — `json.load(a) == json.load(b)` — so nothing was lost in that instance; the formatting difference is enough to break the sha.)

## 4. Execution Sandbox (Suspected Blast Radius)

**Modified:**
- `cleargate-cli/src/commands/upgrade.ts` — after the file pass and snapshot re-stamp, re-run `detectTestStack` + `applyTestStack`. Skipped on `--dry-run`; wrapped so a detection failure warns rather than failing an upgrade whose scaffold is already written.
- `cleargate-cli/src/commands/init.ts` — the install snapshot re-hashes `POST_PROCESSED_FILES` (currently just `gate-checks.json`) from disk with `hashNormalized`, instead of copying the payload sha verbatim.

**Policy left as `always`, deliberately.** `merge-3way` would prompt on a machine-generated file; `preserve` would freeze it and silently miss upstream schema additions. Re-running detection after the overwrite keeps both properties — upstream's schema lands, then the repo's own commands are written back over it. The regression test asserts exactly that: a new upstream key survives *and* `qa.test` is restored.

**Pin-aware hooks deliberately excluded from the re-hash.** [[BUG-023]] established that their snapshot sha stays the *payload* sha and `computeCurrentSha` reverse-substitutes `pin_version` before comparing. Re-hashing those would break that contract.

**Out of scope:** the `prune` and pin-substitution paths, which `[[CR-088]]` fixed and which were verified working in the same run (`0.19.0` → `0.20.0` re-pinned both pin-aware hooks correctly and pruned 9 retired files).

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npm test`

New file `test/commands/upgrade-preserves-gate-commands.node.test.ts`, 4 tests. Suite: **2328 pass / 0 fail / 1 skipped**, typecheck clean.

The central test seeds a detectable stack, applies detection, performs the payload overwrite (reproducing the defect — it asserts `qa.test` really does go blank at that point), then re-runs detection and asserts both that the command is restored *and* that an added upstream key survived.

**Verified end-to-end against a clean install** — see the E2E section below.

---

## Prior work

- [[CR-077]] — *Repo-Derived Test Conventions And Gate Commands*: introduced the test-stack detection that writes these three fields. This bug is the gap between that feature and upgrade's overwrite model; the two were never reconciled.
- [[CR-088]] — *Upgrade Pin And Prune*: made upgrade pin-aware and taught it to prune retired files. Both verified working in the same reproduction run. It did not touch overwrite-policy classification, which is where this defect lives.
- [[CR-079]] — *Worktree Config Provisioning*: adjacent, provisions config into worktrees; does not address upgrade-time preservation.
- [[CR-099]] — established that the meta-repo has no live-instance drift check. This is the same family of problem — a file whose recorded state and real state disagree — in the *installed* case, where a drift check does exist and is fed a wrong baseline.
- No prior item covers upgrade preserving init-generated content.

## Context Source

**context_source:** verified codebase grounding. Found by dogfooding a clean install: created a throwaway repo, installed published `cleargate@0.19.0`, ran `init`, then upgraded to `0.20.0` and compared `gate-checks.json` before and after. Values quoted above are read out of the file, not inferred. The manifest-sha finding came from the same run's `upgrade --dry-run` output. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — deterministic repro, measured before/after, fix location identified**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
