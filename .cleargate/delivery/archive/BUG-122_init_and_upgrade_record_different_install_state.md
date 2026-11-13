<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-122_init-and-upgrade-record-different-install-state.md

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
bug_id: BUG-122
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: upgrade,init,manifest
status: Completed
severity: P2-Medium
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13, reproduced on a pristine copy of the field repo with the published 0.30.0 binary (upgrade --yes, then init, with a dry run after each); code grounding at cli main b9fe36a: src/commands/upgrade.ts applyMerge3Way records hashNormalized(merged) via updateSnapshotEntry (~:409-411); init records the package sha; restampSnapshotVersion sets cleargate_version and pin_version only; init.ts:634 sets installed_at to now(); src/init/copy-payload.ts:176-209 propagates the exec bit, upgrade's applyAlwaysOverwrite does not"
created_at: 2026-11-13T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
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
  last_gate_check: 2026-11-12T22:01:33Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "bd8cde9fee8671d8263bf728a5a7a8c2ef9aebcccde89095044a231c97f6c36f"
---

# BUG-122: `init` and `upgrade` record different install state, so the next dry run misreports `.claude/settings.json`

### Open Questions

- **Question:** What sha should the install snapshot hold for `.claude/settings.json`, whose user hooks ClearGate means to keep ([[BUG-093]] covers the events where it currently drops them)?
- **Recommended:** Hash only the ClearGate-owned part. `computeCurrentSha` for this file hashes the hooks `removeClearGateHooks` would strip (the ClearGate entries), the way pin-aware hooks are hashed with the pin reverse-substituted ([[BUG-023]]). `init` and `upgrade` both record that sha. User hooks then never read as drift, and an edited ClearGate hook does.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** What should the snapshot's dates mean after an upgrade or a re-run `init`?
- **Recommended:** `installed_at` is the first install and is never rewritten. `generated_at` is the package manifest's, written by both commands. A new `upgraded_at` records the last `upgrade` or re-run `init`.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After `upgrade` or a re-run `init`, the install snapshot (`.cleargate/.install-manifest.json`) describes the same install state either way, and the next `upgrade --dry-run` labels each file by what the user actually changed. File modes match the payload.

**Actual Behavior:**
- **settings.json sha.** `upgrade` records the sha of the file it wrote after surgery, user hooks included. `init` records the package sha.
  - After `upgrade`, a settings.json carrying the user's own hooks reads `upstream-changed → clean`, which says the user changed nothing and that it will equal upstream afterwards. Both are false.
  - After `init`, the same file reads `user-modified`.
  - In the field repo the 0.28.0 snapshot (written by an earlier upgrade) already matched a settings.json with the project's own Stop hook. The dry run gave no hint that user content was present, and the agent had to read the surgery code before it dared run `--yes`.
- **Dates.** `upgrade` restamps `cleargate_version` and `pin_version` but not `generated_at`, which stayed `2026-10-04` while `installed_at` was `2026-10-30`. `init` fixes `generated_at` but rewrites `installed_at` to now, losing the original install date.
- **Modes.** The payload ships `.cleargate/scripts/dedupe_frontmatter.mjs` as `-rwxr-xr-x`. `upgrade`'s `always` overwrite leaves the target's `644`; `init` then flips it to `755`, a mode-only git change.

## 2. Reproduction Protocol
1. A repo installed at 0.28.0 whose `.claude/settings.json` has one user hook (any event).
2. `cleargate upgrade --yes`, then `cleargate upgrade --dry-run | grep settings.json`, and record the snapshot's settings.json sha and dates.
3. `cleargate init`, then the same dry run, snapshot read and `git diff --summary`.

Edge conditions:
- A settings.json with no user hooks must read `clean` after either command.
- A user edit to a ClearGate hook must read `user-modified`.

## 3. Evidence & Context
Reproduced 2026-11-13 on a pristine copy of the field repo, published 0.30.0 binary:
```
# after upgrade --yes
snapshot settings sha: 50d9b2829676f6c2…   (the written file, user Stop hook included)
manifest: {"cleargate_version":"0.30.0","pin_version":"0.30.0","installed_at":"2026-10-30T18:10:35.620Z","generated_at":"2026-10-04T09:31:27.642Z"}
[dry-run] .claude/settings.json  action=merge-3way  state=upstream-changed → clean
# after init
snapshot settings sha: 639fefc18361eca1…   (the package's)
manifest: {"cleargate_version":"0.30.0","pin_version":"0.30.0","installed_at":"2026-11-12T21:44:57.718Z","generated_at":"2026-11-12T21:20:10.729Z"}
[dry-run] .claude/settings.json  action=merge-3way  state=user-modified → clean
mode change 100644 => 100755 .cleargate/scripts/dedupe_frontmatter.mjs
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/manifest.ts` `computeCurrentSha` (a settings.json case that hashes ClearGate-owned hooks only).
- `cleargate-cli/src/commands/upgrade.ts` `applyMerge3Way` and `updateSnapshotEntry` (record the same sha `init` records), `restampSnapshotVersion` (`generated_at`, `upgraded_at`), `applyAlwaysOverwrite` and `applyPinAware` (copy the payload mode).
- `cleargate-cli/src/commands/init.ts` ~:634 (keep an existing `installed_at`).

**Do NOT modify:** the surgery itself ([[BUG-093]]); the gate-checks.json sha ([[BUG-091]]).

## Task Breakdown
- [ ] QA-Red: the scenarios below.
- [ ] Settings.json sha over ClearGate-owned hooks, used by init, upgrade and doctor.
- [ ] Snapshot dates; payload modes on upgrade writes.
- [ ] Typecheck, upgrade, init and doctor tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/install-state-parity.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | the state is written by `upgrade` and by `init` |
| Interfaces | T | `upgrade --dry-run` and `doctor` both read it |
| Data | T | user hooks, edited ClearGate hooks, no user hooks |
| Rules | T | the same install yields the same snapshot whichever command wrote it |

```gherkin
Feature: init and upgrade leave the same install state

  @paths @rules
  Scenario Outline: settings.json with a user hook is not drift
    Given an install whose .claude/settings.json has a user Stop hook
    When <command> runs and then cleargate upgrade --dry-run runs
    Then the dry run labels .claude/settings.json clean

    Examples:
      | command                 |
      | cleargate upgrade --yes |
      | cleargate init          |

  @data
  Scenario: An edited ClearGate hook is drift
    Given an install where the user changed the command of a ClearGate PostToolUse hook
    When cleargate upgrade --dry-run runs
    Then .claude/settings.json is labelled user-modified

  @rules
  Scenario: Dates keep their meaning
    Given an install snapshot with installed_at 2026-10-30
    When cleargate upgrade --yes and then cleargate init run
    Then installed_at is 2026-10-30, generated_at equals the package manifest's, and upgraded_at is set

  @interfaces
  Scenario: Upgrade writes payload modes
    Given a target copy of an executable payload script at mode 644
    When cleargate upgrade --yes runs
    Then the file is mode 755
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per scenario row |
| Integration tests | 1 | built CLI, `upgrade` then `init` on a temp install, no packageRoot seam |
| E2E / acceptance tests | 0 | the next field upgrade |

---

## Prior work

- [[BUG-091]] (Draft): the same post-processed-sha pattern for gate-checks.json; settings.json is not covered there.
- [[BUG-093]] (Draft): the settings.json surgery drops user hooks; this item is the snapshot that hides it.
- [[BUG-023]] (Completed): pin reverse-substitution before hashing, the model for hashing only ClearGate's part.
- [[CR-096]] (Completed): snapshot version tracking.

## Context Source

**context_source:** field upgrade test 2026-11-13, reproduced on a pristine copy of the field repo; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
