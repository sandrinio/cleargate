---
story_id: STORY-051-06
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (doctor / CI)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:17:06Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-06: Add a Canonical↔Live↔Root Drift Guard to `cleargate doctor`
**Complexity:** L3 — a new synchronous canonical→live/root comparator wired into the default `cleargate doctor` run that fails non-zero (or `[advisory]` under `CLEARGATE_ADVISORY=1`) when the dogfood-split copies diverge, and skips cleanly in target repos.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer (and CI), I want `cleargate doctor` to detect when the canonical scaffold (`cleargate-planning/.claude`, `cleargate-planning/.cleargate/{scripts,knowledge,templates}`, and the `cleargate-planning/CLAUDE.md` bounded block) has drifted from the live copies that actually execute (`/.claude`, `/.cleargate`, root `CLAUDE.md`), so that the manual "re-sync after every canonical edit" step is backstopped by a real gate — the structural root cause that shipped a stale live `qa.md` and left root `CLAUDE.md` carrying a retired `execution_mode` paragraph after CR-074.

### 1.2 Detailed Requirements
- **R1 — canonical→live tree diff.** The check compares every file under canonical `cleargate-planning/.claude/**`, `cleargate-planning/.cleargate/scripts/**`, `cleargate-planning/.cleargate/knowledge/**`, and `cleargate-planning/.cleargate/templates/**` against the same relative path under live `<cwd>/.claude/**` and `<cwd>/.cleargate/**`, using content-normalized hashing (`hashNormalized`). A canonical file missing from live, or whose normalized content differs, is drift.
- **R2 — CLAUDE.md block diff.** The check compares `readBlock(cleargate-planning/CLAUDE.md)` against `readBlock(<cwd>/CLAUDE.md)` (the `<!-- CLEARGATE:START -->…<!-- CLEARGATE:END -->` bounded block), normalized. A mismatch, or a missing block on either side, is drift naming `CLAUDE.md`.
- **R3 — hard fail.** On any drift and no advisory bypass, the check prints one line per drifted path (naming the path and the reason) and causes `cleargate doctor` to exit non-zero (exit 1, via `outcome.blocker`).
- **R4 — advisory opt-out.** When `CLEARGATE_ADVISORY=1` (via `isAdvisory()`), the same drift is printed with an `[advisory]` prefix and does **not** set the blocker — the exit code is unaffected by drift. This is the only sanctioned softening lever.
- **R5 — meta-repo-aware skip.** When `<cwd>/cleargate-planning/` is absent (every target-repo install), the check performs no comparison, emits no drift lines, and never affects the exit code. Only the meta-repo (where canonical exists) is enforced.
- **R6 — report-only, never mutates.** The check reads only; canonical, live, and root `CLAUDE.md` are byte-identical before and after it runs (no auto-fix, no `cp`, no strip).
- **R7 — normalization + live-only tolerance.** Comparison is normalized for BOM / CRLF→LF / trailing-newline (so pure line-ending differences are not drift), and files present only in live but not in canonical (e.g. `settings.local.json`, `worktrees/`, `scratch/`) are ignored — the walk is canonical-driven.

### 1.3 Out of Scope
- Canonical→payload parity (`cleargate-cli/templates/cleargate-planning/**`) — already machine-mirrored by `npm run prebuild` (`copy-planning-payload.mjs`); this guard does not re-check it.
- **Auto-fixing drift.** Report only. Re-syncing (`cleargate init` / hand-port) stays a human action, per FLASHCARD 2026-07-17 (blind `cp` already destroyed live-only content once).
- Editing `cleargate-planning/.claude/hooks/session-start.sh` to surface drift in the SessionStart banner. Deferred: the hard `cleargate doctor` gate is the deliverable; a banner advisory can later be added through the existing `doctor --session-start` code path without a three-copy shell-hook re-sync.
- A dedicated `--check-drift` flag / new CLI surface. The check folds into the default hook-health mode so bare `cleargate doctor` catches it (matching the Epic's literal success metric); no `cli.ts` option is added.
- Comparing `config.yml`, `config.example.yml`, `FLASHCARD.md`, `delivery/`, `hook-log/`, `sprint-runs/`, `wiki/`, `reports/`, `scratch/` — these are intentionally per-repo and would be false positives.

### 1.4 Open Questions
> Every decision this story depends on is RESOLVED. No new open question surfaced while drafting.
- **Question:** Should canonical↔live / canonical↔root-`CLAUDE.md` drift be a hard `cleargate doctor` failure or a manual remembered re-sync?
- **Recommended:** Hard doctor check — this is the structural root cause of recurring drift (it bit CR-074).
- **Human decision (FINAL, gate review):** **Q3 = HARD doctor check.** `cleargate doctor` exits non-zero on canonical↔live or canonical↔root-`CLAUDE.md` drift; an advisory/opt-out mode (`CLEARGATE_ADVISORY=1`) is secondary. It must skip cleanly in target repos that have no `cleargate-planning/`.

### 1.5 Risks
- **Risk:** A hard check blocks sessions/CI in a target repo that legitimately has no canonical scaffold. / **Mitigation:** R5 — when `cleargate-planning/` is absent the check is a no-op and never touches the exit code; enforcement is meta-repo-only.
- **Risk:** Shared-file collision with sibling EPIC-051 stories that also edit `cleargate-cli/src/commands/doctor.ts` (the vocabulary sweep / gate-repair stories name it in the Epic `target_files`). / **Mitigation:** all comparison logic lives in the net-new `cleargate-cli/src/lib/drift-check.ts`; the `doctor.ts` change is one import plus a ~4-line call appended after the existing STORY-070-01 `execution_mode` scan (doctor.ts:234-262), minimizing the diff footprint and merge surface.
- **Risk:** False positives from machine-specific or per-repo files (e.g. `settings.local.json`, `config.yml`). / **Mitigation:** the walk is canonical-driven with an explicit include-list (§1.3 exclusions), and comparison is content-normalized (R7).
- **Risk:** Per-invocation cost of walking + hashing the canonical tree on every bare `cleargate doctor`. / **Mitigation:** the tree is small (dozens of files), reads are synchronous, and it runs only in the meta-repo (skipped everywhere else).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: Canonical↔Live↔Root drift guard in cleargate doctor

  Background:
    Given a fixture repo containing a cleargate-planning/ canonical tree
    And live /.claude, /.cleargate, and a root CLAUDE.md with a CLEARGATE block

  Scenario: Clean scaffold reports no drift (normalization + live-only tolerance)
    Given every live scaffold file matches canonical except a trailing-newline-only diff
    And live /.claude contains an extra settings.local.json absent from canonical
    And the root CLAUDE.md block equals the canonical CLAUDE.md block
    When I run `cleargate doctor` with no advisory env set
    Then no drift line is printed
    And the drift guard does not set the blocker exit

  Scenario: Stale live copy fails the guard and names the path
    Given live /.claude/agents/qa.md differs in content from canonical
    When I run `cleargate doctor` with no advisory env set
    Then the output names .claude/agents/qa.md as drifted
    And cleargate doctor exits non-zero
    And canonical, live, and root CLAUDE.md are byte-identical afterward

  Scenario: Root CLAUDE.md block drift fails the guard
    Given the root CLAUDE.md CLEARGATE block differs from the canonical block
    When I run `cleargate doctor` with no advisory env set
    Then the output names CLAUDE.md as drifted
    And cleargate doctor exits non-zero

  Scenario: Advisory opt-out downgrades drift to non-blocking
    Given live /.claude/agents/qa.md differs from canonical
    When I run `cleargate doctor` with CLEARGATE_ADVISORY=1
    Then the drift line is printed with an [advisory] prefix
    And the drift guard does not set the blocker exit
    And qa.md is unchanged

  Scenario: Target repo without canonical skips cleanly
    Given a repo with no cleargate-planning/ directory
    When I run `cleargate doctor`
    Then no drift line is printed
    And the drift guard neither raises nor lowers the exit code
```

### 2.2 Verification Steps (Manual)
- [ ] `cd cleargate-cli && npx tsc --noEmit` is clean.
- [ ] `cd cleargate-cli && npx tsx --test test/commands/doctor-drift-guard.node.test.ts` is green.
- [ ] From this meta-repo root, `node cleargate-cli/dist/cli.js doctor` names `.claude/agents/qa.md` and `CLAUDE.md` as drifted and exits non-zero (both drifts exist today — the guard's real-world proof).
- [ ] Re-run with `CLEARGATE_ADVISORY=1 node cleargate-cli/dist/cli.js doctor`: the same paths print with `[advisory]` and the command no longer exits non-zero due to drift.
- [ ] Run `cleargate doctor` in a tmpdir with a `.cleargate/` but no `cleargate-planning/`: no drift lines, no drift-driven non-zero exit.
- [ ] `git status` after any drift run shows no modified scaffold files (report-only).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/doctor.ts` — import `checkCanonicalDrift`; call it near the end of `runHookHealth` (after the STORY-070-01 `execution_mode` scan, doctor.ts:234-262); print drift lines and, unless `isAdvisory()`, set `outcome.blocker = true`. |
| New File | `cleargate-cli/src/lib/drift-check.ts` — synchronous `checkCanonicalDrift(cwd): DriftReport`: canonical-existence gate, canonical-tree walk + `hashNormalized` compare, CLAUDE.md-block compare via `readBlock`. |
| New File | `cleargate-cli/test/commands/doctor-drift-guard.node.test.ts` — node:test (`tsx --test`, `*.node.test.ts`) covering §2.1's five scenarios against a tmpdir fixture. |
| Related File (import, read-only) | `cleargate-cli/src/lib/sha256.ts:22` — `hashNormalized` for BOM/CRLF/trailing-newline-normalized content comparison. |
| Related File (import, read-only) | `cleargate-cli/src/lib/claude-md-surgery.ts:13` — `readBlock` to extract the `CLEARGATE:START/END` block from both CLAUDE.md files (markers confirmed present: root `CLAUDE.md:129/188`, canonical `cleargate-planning/CLAUDE.md:7/66`). |
| Related File (import, read-only) | `cleargate-cli/src/util/gate-mode.ts:14` — `isAdvisory()` for the `CLEARGATE_ADVISORY=1` opt-out. |
| Reference (not modified) | `cleargate-cli/src/init/inject-claude-md.ts:25` — `extractBlock` (alternate block extractor); confirms the injection-block contract this guard mirrors. |
| Reference (not modified) | `cleargate-planning/.claude/hooks/session-start.sh` — the SessionStart hook that calls `cleargate doctor --session-start`; explicitly not edited (§1.3). |

### 3.2 Technical Logic

**New helper — `cleargate-cli/src/lib/drift-check.ts` (synchronous).**
Export:
```
export type DriftReason = 'content-mismatch' | 'missing-in-live' | 'claude-md-block-mismatch';
export interface DriftedPath { path: string; reason: DriftReason; }
export interface DriftReport { skipped: boolean; drifted: DriftedPath[]; }
export function checkCanonicalDrift(cwd: string): DriftReport;
```
Algorithm:
1. **Canonical gate (R5).** `const canonicalRoot = path.join(cwd, 'cleargate-planning');` If `!fs.existsSync(canonicalRoot)` → `return { skipped: true, drifted: [] }`.
2. **Tree diff (R1, R7).** Include-list of canonical roots relative to `cleargate-planning/`: `.claude`, `.cleargate/scripts`, `.cleargate/knowledge`, `.cleargate/templates`. For each, recursively walk canonical files (skip directories that are symlinks/absent). For every canonical file at relative path `rel`:
   - Live path = `path.join(cwd, rel)`. If `!fs.existsSync(livePath)` → push `{ path: rel, reason: 'missing-in-live' }`.
   - Else compare `hashNormalized(fs.readFileSync(canonicalPath))` vs `hashNormalized(fs.readFileSync(livePath))`; on mismatch push `{ path: rel, reason: 'content-mismatch' }`.
   The walk is canonical-driven, so live-only files are ignored (R7). Normalization is delegated to `hashNormalized` (BOM/CRLF/trailing-newline).
3. **CLAUDE.md block diff (R2).** Read `cleargate-planning/CLAUDE.md` and `<cwd>/CLAUDE.md`. `const cBlk = readBlock(canonicalContent); const rBlk = readBlock(rootContent);` If either is `null`, or `hashNormalized(cBlk) !== hashNormalized(rBlk)` → push `{ path: 'CLAUDE.md', reason: 'claude-md-block-mismatch' }`.
4. **Return** `{ skipped: false, drifted }`. The helper throws nothing for expected-missing inputs; unreadable individual files are caught and treated as `missing-in-live` (report, never crash — R6 report-only).

**Wiring — `cleargate-cli/src/commands/doctor.ts` (`runHookHealth`).**
Append after the STORY-070-01 `execution_mode` scan block (currently ending at doctor.ts:262, inside the function that receives `outcome?: DoctorOutcome`):
```
const drift = checkCanonicalDrift(cwd);
if (!drift.skipped && drift.drifted.length > 0) {
  const advisory = isAdvisory();
  for (const d of drift.drifted) {
    stdout(`${advisory ? '[advisory] ' : ''}scaffold drift: ${d.path} (${d.reason})`);
  }
  if (!advisory && outcome) outcome.blocker = true;   // → doctorHandler exits 1 (doctor.ts:1027)
}
```
`runHookHealth` stays synchronous (`checkCanonicalDrift` and `hashNormalized` are sync; do not use the async `hashFile`). No change to `selectMode`, `DoctorFlags`, `DoctorMode`, or `cli.ts` — the guard rides the default mode so bare `cleargate doctor` enforces it (Epic metric), and `CLEARGATE_ADVISORY=1` softens it (R4) via the existing exit machinery at doctor.ts:1025-1031.

**Exit behavior:** drift + no advisory → `outcome.blocker` → `exit(1)`. drift + advisory → informational lines, no blocker → exit unchanged. no canonical → skipped, exit unchanged. This story adds no `cleargate-planning/**` edits, so no canonical→live→payload re-sync is required for it.

### 3.3 API Contract (if applicable)

| Surface | Condition | stdout | Exit effect |
|---|---|---|---|
| `cleargate doctor` (default mode) | canonical present, drift found, no advisory | `scaffold drift: <path> (<reason>)` per path | `outcome.blocker` → exit 1 |
| `cleargate doctor` (default mode) | canonical present, drift found, `CLEARGATE_ADVISORY=1` | `[advisory] scaffold drift: <path> (<reason>)` per path | no drift-driven exit change |
| `cleargate doctor` (default mode) | canonical present, no drift | (nothing from the guard) | no change |
| `cleargate doctor` (default mode) | `cleargate-planning/` absent | (nothing from the guard) | no change |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit (`checkCanonicalDrift`, node:test) | 4 | clean-with-normalization/live-only tolerance; content-mismatch detection; CLAUDE.md-block mismatch; canonical-absent skip. Real tmpdir fixtures, no mocks. |
| Integration (spawn built `dist/cli.js doctor`, node:test) | 3 | drift → exit non-zero + path named; `CLEARGATE_ADVISORY=1` → `[advisory]` + no drift-driven non-zero; no-mutation assertion (files byte-identical after run). Pattern mirrors `doctor-retired-field.red.node.test.ts`. |
| Total | 7 | `*.node.test.ts` via `tsx --test`; vitest forbidden (EPIC-028). |

### 4.2 Definition of Done (The Gate)
- [ ] `checkCanonicalDrift` implemented in `cleargate-cli/src/lib/drift-check.ts` (synchronous, report-only, canonical-existence gated).
- [ ] `runHookHealth` in `doctor.ts` calls it, prints per-path drift lines, and sets `outcome.blocker` unless `isAdvisory()`.
- [ ] node:test file green (`tsx --test test/commands/doctor-drift-guard.node.test.ts`); all §2.1 scenarios covered.
- [ ] Every §1.2 requirement (R1–R7) maps to at least one Gherkin scenario.
- [ ] `npx tsc --noEmit` clean in `cleargate-cli/`.
- [ ] Verified in this meta-repo: bare `cleargate doctor` reports the live `qa.md` + root `CLAUDE.md` drift and exits non-zero; `CLEARGATE_ADVISORY=1` downgrades it.
- [ ] Canonical→live→payload sync: **N/A for this story** — it edits only `cleargate-cli/src/**` and `cleargate-cli/test/**`; no `cleargate-planning/**` surface changes. (This guard is itself the mechanism that will hereafter enforce that sync for other stories.)
- [ ] Grep gate: no new `execution_mode`/`v1`/`v2`/`CLEARGATE_EXEC_MODE`/`CLEARGATE_PARALLEL_WAVES` behavior tokens introduced; the only enforcement lever used is `CLEARGATE_ADVISORY`.
- [ ] Report-only confirmed: `git status` shows no scaffold-file mutation after drift runs.

## Existing Surfaces
> L1 reuse audit.
- **Surface:** `cleargate-cli/src/lib/sha256.ts:22` — `hashNormalized(content)` normalizes BOM/CRLF/trailing-newline and returns a SHA256; the content-equality primitive for the canonical↔live compare.
  - **Coverage of this requirement:** ≥80% of the "compare two files ignoring line-ending noise" need (R7). The remaining ~20% (walking the canonical tree, choosing the include-list, mapping to `DriftReason`) is the net-new orchestration in `drift-check.ts`.
- **Surface:** `cleargate-cli/src/lib/claude-md-surgery.ts:13` — `readBlock(content)` extracts the `CLEARGATE:START/END` block (regex handles inline marker prose). Also `cleargate-cli/src/init/inject-claude-md.ts:25` `extractBlock`.
  - **Coverage of this requirement:** ≥80% of R2 (the block-extraction half); the normalized comparison + drift reporting is the small net-new part.
- **Surface:** `cleargate-cli/src/util/gate-mode.ts:14` — `isAdvisory()` returns true only for `CLEARGATE_ADVISORY=1`.
  - **Coverage of this requirement:** 100% of R4's advisory gate — reused verbatim, no new env parsing.
- **Surface:** `cleargate-cli/src/commands/doctor.ts:151` `runHookHealth` + the `DoctorOutcome` accumulator (doctor.ts:59) with exit mapping at doctor.ts:1025-1031, and the STORY-070-01 `execution_mode` scan at doctor.ts:234-262.
  - **Coverage of this requirement:** 100% of R3's "exit non-zero" plumbing and the insertion pattern; the canonical-tree walk and CLAUDE.md-block comparison (R1/R2) are net-new logic living in `drift-check.ts`.

## Why not simpler?
- **Smallest existing surface that could carry this:** `runCheckScaffold` (`cleargate-cli/src/commands/doctor.ts:316`) already computes scaffold drift — but against the recorded **install snapshot** + **package manifest** for end-user upgrade classification (`user-modified` / `upstream-changed`), not the meta-repo's canonical directory vs the live gitignored copy, and it has no CLAUDE.md-block comparison. It cannot carry this without inverting its semantics.
- **Why isn't extension / parameterization / config sufficient?** `--check-scaffold` compares live against the *payload package* and the *install snapshot* captured at `cleargate init` time; in the meta-repo the payload is a derived mirror (canonical is the source of truth) and the install snapshot never includes the root `CLAUDE.md` bounded block. Parameterizing it to also mean "canonical dir → live dir + CLAUDE.md-block" would overload one command with two contradictory reference models. A net-new comparator — one small synchronous helper that reuses three existing primitives (`hashNormalized`, `readBlock`, `isAdvisory`) and plugs into the existing exit machinery — is both smaller and clearer than bending `--check-scaffold`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2. (R1→S2; R2→S3; R3→S2/S3; R4→S4; R5→S5; R6→S2/S4; R7→S1.)
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding (doctor.ts:151/234-262/1025-1031, sha256.ts:22, claude-md-surgery.ts:13, inject-claude-md.ts:25, gate-mode.ts:14; markers confirmed at root CLAUDE.md:129/188 and canonical CLAUDE.md:7/66).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (four cited, all with `/`).
- [x] Why not simpler? has both sub-bullets answered.

> Remaining gap to 🟢 is the Epic-level `approved: true`, which is set on the Epic, not in this story.