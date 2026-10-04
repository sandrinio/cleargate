<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-091_doctor-check-scaffold-flags-post-processed-gate-checks.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-091
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli,doctor,manifest
status: Draft
severity: P3-Low
reporter: orchestrator (SPRINT-41 M4 Architect probe F8)
approved: false
context_source: measured reproduction in .cleargate/sprint-runs/SPRINT-41/plans/M4.md "Measured facts" F8 (cli dist built from 2e566b5), verified against cli main src/lib/manifest.ts classify() and src/commands/init.ts POST_PROCESSED_FILES
created_at: 2026-09-25T18:50:00Z
updated_at: 2026-09-25T18:31:46Z
created_at_version: strategy-phase-pre-init
updated_at_version: 45ef413c-dirty
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
  last_gate_check: 2026-09-25T18:31:46Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-091: `doctor --check-scaffold` reports a pristine install's gate-checks.json as upstream-changed

### Open Questions

- **Question:** Should the drift engine compare a post-processed file against the package sha at all?
- **Recommended:** No. For every path in init's `POST_PROCESSED_FILES`, classify on install sha vs. current sha only (`clean` / `user-modified`). An upstream change to such a file is still visible to `upgrade`, which re-runs the post-processing. Keep one exported set shared by init and doctor instead of the literal duplicated in `init.ts`.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** On a fresh, untouched install, `cleargate doctor --check-scaffold` reports every tracked file `clean`.

**Actual Behavior:** It reports `1 upstream-changed` for `.cleargate/scripts/gate-checks.json` and tells a pristine install to "Run cleargate upgrade". Init rewrites that file per the detected test stack (`applyTestStack`). [[BUG-037]] made init record the post-processed sha in the install snapshot (`POST_PROCESSED_FILES`, `init.ts:598`), so install sha == current sha but ≠ package sha. `classify()` (`src/lib/manifest.ts`) maps `pkg ≠ install == current` to `upstream-changed`.

## 2. Reproduction Protocol
1. `git init` a scratch dir, then run `node <cli>/dist/cli.js init --yes`.
2. Without editing anything, run `node <cli>/dist/cli.js doctor --check-scaffold`.
3. Observe `1 upstream-changed` naming `.cleargate/scripts/gate-checks.json` (`7d9672→7d9672 vs fa8e2a`) and the upgrade advice.

Edge conditions:
- A repo where `applyTestStack` detects no stack, so the file is written byte-equal to the payload. This must stay `clean`.
- A user who later edits `gate-checks.json`. This must be `user-modified`.

## 3. Evidence & Context
```
doctor --check-scaffold (fresh install, cli dist built from 2e566b5):
  1 upstream-changed   .cleargate/scripts/gate-checks.json   7d9672→7d9672 vs fa8e2a
  → Run cleargate upgrade

src/lib/manifest.ts classify():
  | B (≠A) | A | A | upstream-changed |
src/commands/init.ts:598
  const POST_PROCESSED_FILES = new Set(['.cleargate/scripts/gate-checks.json']);
```
Measured by the SPRINT-41 M4 Architect probe (`plans/M4.md` "Measured facts" F8). Default (hook-health) doctor mode exits 0, so the -08 `verify-install` check is unaffected.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/manifest.ts`: `classify()` or its caller in the drift map.
- `cleargate-cli/src/commands/doctor.ts`: the `--check-scaffold` summary around `:328-407`.
- `cleargate-cli/src/commands/init.ts:598`: hoist `POST_PROCESSED_FILES` to one exported constant.
- Sequence this after SPRINT-41 M3. STORY-058-06 and -07 rewrite `manifest.ts`, init Step 7 and doctor's per-host summary, so the anchors move.

## Task Breakdown
- [ ] QA-Red: fresh install → `--check-scaffold` reports `gate-checks.json` clean. A user edit reports it `user-modified`. A no-stack install stays clean.
- [ ] Export one `POST_PROCESSED_FILES` set and use it in init and in the drift classification.
- [ ] Post-processed paths classify on install vs. current sha only.
- [ ] Typecheck and targeted tests, run solo.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/doctor-check-scaffold-post-processed.red.node.test.ts` (new), run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful outcomes: pristine is `clean`, and user-edited is `user-modified`. |
| Interfaces | F | One surface only: `doctor --check-scaffold`. Default doctor mode does not classify drift. |
| Data | T | A detected test stack (the file is rewritten) versus no stack (the file is byte-equal to the payload). |
| Rules | T | Post-processed files are never `upstream-changed` on a pristine install. |

```gherkin
Feature: Post-processed files do not read as upstream drift

  @paths @rules
  Scenario: A pristine install reports gate-checks.json clean
    Given a fresh `cleargate init` in a repo with a detected test stack
    When `cleargate doctor --check-scaffold` runs
    Then gate-checks.json is reported clean and no upgrade is advised

  @paths
  Scenario: A user edit to gate-checks.json is still detected
    Given a fresh install whose gate-checks.json the user then edits
    When `cleargate doctor --check-scaffold` runs
    Then gate-checks.json is reported user-modified

  @data
  Scenario: No detected test stack keeps the file clean
    Given a fresh install where applyTestStack detects no stack
    When `cleargate doctor --check-scaffold` runs
    Then gate-checks.json is reported clean
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | One per Gherkin scenario. |
| Integration tests | 1 | A real `init` followed by `doctor --check-scaffold` in a tmp repo. |
| E2E / acceptance tests | 0 | The -08 `verify-install` gates default doctor mode only; covered by the integration test. |

---

## Prior work

- [[BUG-037]]: made init record the post-`applyTestStack` sha for `POST_PROCESSED_FILES`. It never touched doctor's `--check-scaffold` classification, which still compares against the package sha. This bug extends it.
- [[STORY-009-04]]: origin of the `--check-scaffold` three-sha drift design (package vs. install vs. current).

## Context Source

**context_source:** measured reproduction in `.cleargate/sprint-runs/SPRINT-41/plans/M4.md` F8, verified against cli `main` source.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity.** The classification-rule question is open, and approval is pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
