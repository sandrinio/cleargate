---
bug_id: BUG-003
parent_ref: EPIC-009
parent_cleargate_id: "EPIC-009"
sprint_cleargate_id: "SPRINT-11"
status: Verified
severity: P3-Low
reporter: sandro
approved: true
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-24T14:23:28Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-003
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T14:23:28Z
  sessions: []
---

# BUG-003: `cleargate-planning/MANIFEST.json` Regenerates Dirty On Every Build

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
`cleargate-planning/MANIFEST.json` is either (a) not tracked by git (regenerated artifact), or (b) tracked and deterministic — running `npm run build` on a clean working tree must not produce diffs.

**Actual Behavior:**
The file is tracked AND regenerates non-deterministically. Every `npm run build` (and every `cleargate` command that triggers the build step transitively) updates:
- `generated_at` timestamp (always changes).
- ~3–5 per-file SHA-256 entries (change when scaffold source files are touched — legitimate — but also drift because the generator walks a mutable scaffold surface).

Consequence: every sprint-close workflow has this file dirty in `git status`; every worktree-switch fails until stashed; every `git add .` risks silently including it in an unrelated commit (happened at SPRINT-11 during the archive step — required a follow-up commit to untrack).

## 2. Reproduction Protocol

1. Clean checkout at `main`: `git status` — tree clean.
2. `cd cleargate-cli && npm run build --silent && cd ..`
3. `git status --short` — observe: `M cleargate-planning/MANIFEST.json`.
4. `git diff cleargate-planning/MANIFEST.json | head -5` — `generated_at` timestamp has flipped; potentially a few `sha256` entries too.

## 3. Evidence & Context

Example diff captured mid-SPRINT-11:
```
diff --git a/cleargate-planning/MANIFEST.json b/cleargate-planning/MANIFEST.json
index bcaceb5..7888e84 100644
--- a/cleargate-planning/MANIFEST.json
+++ b/cleargate-planning/MANIFEST.json
@@ -1,10 +1,10 @@
 {
   "cleargate_version": "0.2.1",
-  "generated_at": "2026-04-21T18:57:13.475Z",
+  "generated_at": "2026-04-24T08:52:49.393Z",
```

Observed at every sprint-archive, worktree switch, and merge during SPRINT-11 (commits referencing this: `4539ed3`, `175ae06`, `a4a0f30`, `6bb8a18`, `82514dd` all had to stash/re-stash it).

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify (pick one of two approaches — confirm before executing):**

**Approach A — untrack (simplest):**
- `.gitignore` — add `cleargate-planning/MANIFEST.json`
- `git rm --cached cleargate-planning/MANIFEST.json`
- Confirm `cleargate init` / `cleargate upgrade` on a downstream consumer doesn't depend on the checked-in MANIFEST (the CLI's own `dist/` bundle ships the package-shipped MANIFEST separately).

**Approach B — deterministic regeneration:**
- `cleargate-cli/src/commands/build-manifest.ts` (or wherever the generator lives) — drop `generated_at` OR pin it to a deterministic value (e.g., latest git commit timestamp on the scaffold source tree, so identical source = identical manifest).
- Add a pre-commit hook in `.claude/hooks/` that runs `cleargate build-manifest` + re-stages, preventing pre-existing drift from creeping into commits.

**Do NOT modify:**
- The `cleargate-cli` MANIFEST generator for the published npm package (different MANIFEST; shipping correctness depends on it being regenerated per-release).

## 5. Verification Protocol (The Failing Test)

**Command (failing before fix, passing after):**
```
git stash; npm run build --workspace=cleargate-cli --silent; git diff --exit-code cleargate-planning/MANIFEST.json; echo "exit=$?"
```
Expect `exit=0` (no diff).

Unit-test level: either (a) CI check that `git status` is clean after `npm run build`, or (b) if untracked: assert `.gitignore` contains the path and `git ls-files` does not.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Decide Approach A (untrack) vs. B (deterministic regeneration). Approach A is smaller and matches the file's "derived artifact" semantics; B preserves the ability to reason about manifest contents from git history.
- [ ] Confirm no downstream consumer reads the checked-in MANIFEST directly (the npm-package MANIFEST is separate at `cleargate-cli/MANIFEST.json` / `dist/`).
- [ ] `approved: true` set.
