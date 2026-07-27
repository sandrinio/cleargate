---
story_id: STORY-051-08
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (enforcement levers)
complexity_label: L2
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
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:17:07Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-5
  last_stamp: 2026-07-27T12:15:02Z
  sessions:
    - session: ef81765d-88a0-4931-a963-4c83e79ea0e6
      model: <synthetic>,claude-opus-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-07-27T11:31:07Z
---

# STORY-051-08: Narrow Break-Glass Semantics — Scope CLEARGATE_ADVISORY & Guard --assume-ack
**Complexity:** L2 — correct the `CLEARGATE_ADVISORY` scope overclaim in enforcement §15 and give `close_sprint.mjs --assume-ack` a mechanical CI-token guard so "never pass it autonomously" becomes a mechanism.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer responsible for the enforcement levers, I want `CLEARGATE_ADVISORY`'s documented reach to match the two CLI sites that actually honor it and `close_sprint.mjs --assume-ack` to physically refuse an autonomous close (not merely be told not to), so that the break-glass surface is honest and the Gate-4 close rule is enforced by code rather than by trust.

### 1.2 Detailed Requirements
- Narrow enforcement §15's `CLEARGATE_ADVISORY=1` description: replace the "all gate failures in the CLI (`cleargate sprint preflight`, `cleargate sprint init`, etc.)" overclaim with the true, enumerated scope — it downgrades gate failures at the `cleargate sprint preflight` gate (`sprint.ts` `isAdvisory()`) and the `cleargate sprint init` story-file assertion (`init_sprint.mjs`) only.
- §15 must state explicitly that `CLEARGATE_ADVISORY` does NOT soften the file-surface, decomposition, lifecycle-init/reconciliation, or sprint-close gates, and is NOT a universal enforcement-strength knob.
- Do NOT add the lever to any gate that does not already honor it (no new honor sites in `file_surface_diff.sh`, `reconcileDecomposition`, lifecycle reconciler, or `close_sprint.mjs`).
- Add a mechanical guard to `close_sprint.mjs`: when `--assume-ack` is present in argv and `process.env.CLEARGATE_CI_ACK !== '1'`, write an explanatory stderr line and exit non-zero (exit code 2) before any close work runs.
- Only the exact string `'1'` satisfies the guard token; `'0'`, `'true'`, `''`, or an absent `CLEARGATE_CI_ACK` still cause `--assume-ack` to be refused (mirrors `isAdvisory()` truthiness).
- The guard must not affect the no-flag path: a close run WITHOUT `--assume-ack` still prints the "Review the report, then confirm close by re-running with --assume-ack" prompt and exits 0, with no token required.
- Update enforcement §12.3 (Flag Reservation) to document the guard: `--assume-ack` refuses unless `CLEARGATE_CI_ACK=1`; the token is CI-only and the conversational orchestrator MUST NOT set it.
- Update the sprint-close guardrail wording in root `CLAUDE.md` and canonical `cleargate-planning/CLAUDE.md` (and its payload mirror) to state the guard exists: `close_sprint.mjs` now refuses `--assume-ack` unless `CLEARGATE_CI_ACK=1` (CI-only); do not set that token.
- Add node:test coverage for the guard (refuse-without-token, allow-with-token, no-flag-path-unaffected, non-`'1'`-values-refused).
- Set `CLEARGATE_CI_ACK=1` at the test-harness level so the existing close suites that pass `--assume-ack` stay green (see §3.2): `cleargate-cli/package.json` test scripts + the standalone `close_sprint.deferred-verify.red.node.test.ts` `baseEnv()`.
- Mirror every canonical edit under `cleargate-planning/**` to the live `/.cleargate` copies and the npm payload (`npm run prebuild`).

### 1.3 Out of Scope
- Threading `CLEARGATE_ADVISORY` into any additional gate (file-surface / decomposition / lifecycle-init / close) — explicitly rejected by resolved Q1.
- Removing the pre-existing `CLEARGATE_ADVISORY` honor at `init_sprint.mjs:140` or `pending-task-sentinel.sh:129`, or reconciling the worktree/lifecycle-gate cross-references in enforcement §1/§1.5/§10 — those are gate-logic claims owned by STORY-051-01/03.
- The core gate-blocking logic for file-surface / test-ratchet / decomposition gates (STORY-051-01/03).
- Reintroducing `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` / `CLEARGATE_PARALLEL_WAVES` as behavior switches.
- Gating the `--report-body-stdin` ack-implying path (a distinct STORY-014-10 programmatic report-writing mode, not the autonomous-close risk this guard addresses).

### 1.4 Open Questions
> Both policy decisions this story depends on are RESOLVED and recorded below as the Human decision. One NEW question surfaced during code grounding.

- **Question (Q1, resolved):** Should `CLEARGATE_ADVISORY` become a universal strength knob threaded through all gates, or should §15 be narrowed to its true scope?
- **Human decision:** NARROW — `CLEARGATE_ADVISORY` softens only `cleargate sprint preflight`; narrow the §15 "all CLI gates" claim to match; do NOT add the lever to other gates.

- **Question (Q2, resolved):** Should `--assume-ack` get mechanical teeth, or be relabeled an unenforceable trust gate?
- **Human decision:** ADD CI-TOKEN GUARD — `close_sprint.mjs --assume-ack` refuses (exits non-zero) unless `CLEARGATE_CI_ACK=1` is set.

- **Question (NEW — discovered while grounding):** The resolved Q1 shorthand says "ONLY `cleargate sprint preflight`," but grounding found a second CLI honor site: `init_sprint.mjs:140` downgrades the `cleargate sprint init` story-file assertion under `CLEARGATE_ADVISORY=1` today (a `pending-task-sentinel.sh:129` hook site also honors it). A literal "preflight-only" sentence would therefore be a fresh *underclaim*.
- **Recommended:** Enumerate the true scope in §15 — `cleargate sprint preflight` **and** the `cleargate sprint init` story-file assertion — and disclaim all other gates. This satisfies Q1's operative intent (not universal; not threaded into file-surface/decomposition/lifecycle-init/close, none of which the sprint-init story-file assertion is) while staying code-truthful. Requires no code change; §3.2 commits to this wording.
- **Human decision:** RATIFIED (Gate 1, 2026-07-17) — narrow §15 to enumerate the true honor sites (`cleargate sprint preflight` + the `cleargate sprint init` story-file assertion, and note the `pending-task-sentinel.sh:129` hook honor-site) and disclaim file-surface / decomposition / lifecycle-init / close. No honor site is added or removed; this supersedes the literal "only preflight" shorthand of Q1.

### 1.5 Risks
- **Risk:** The guard breaks the many existing close suites that pass `--assume-ack` (10 files under `cleargate-cli/test/**` plus the co-located `close_sprint.deferred-verify.red.node.test.ts`). / **Mitigation:** Every one of those spawn helpers spreads `...process.env`, so setting `CLEARGATE_CI_ACK=1` once in the `cleargate-cli/package.json` test scripts (propagates to all `test/**` children) and once in the standalone red test's `baseEnv()` keeps them green — no per-file edits. Document the token as CI-only.
- **Risk:** The guard's own new test would inherit the harness-level `CLEARGATE_CI_ACK=1` and never exercise the refusal branch. / **Mitigation:** The refuse-case in the new test must delete/override `CLEARGATE_CI_ACK` from the child env (do not inherit `'1'`); §3.2 and §4.1 pin this.
- **Risk (shared-file collision):** This story edits `cleargate-enforcement.md`, root `CLAUDE.md`, and `cleargate-planning/CLAUDE.md` — the same doc surfaces edited by sibling doc stories (esp. STORY-051-05). / **Mitigation:** Sequence this story AFTER STORY-051-05 so it lands on top of the vocabulary sweep; the §15/§12.3/guardrail edits here are additive and localized (advisory-scope sentence + Flag-Reservation paragraph + one guardrail clause), minimizing merge conflict.
- **Risk:** Choosing exit code 2 vs 1 for the refusal. / **Mitigation:** Exit 2 is used deliberately — it matches `close_sprint.mjs`'s existing `usage()` exit(2) convention (line 123) for reserved-flag/invocation misuse; the requirement is only "non-zero," and the test pins the exact code chosen.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Narrow break-glass semantics — scoped CLEARGATE_ADVISORY and a guarded --assume-ack

  Scenario: --assume-ack is refused without the CI token
    Given a closable sprint with all stories terminal
    And CLEARGATE_CI_ACK is unset (or any value other than exactly "1")
    When close_sprint.mjs runs with --assume-ack
    Then it writes an error naming CLEARGATE_CI_ACK to stderr
    And it exits with a non-zero code (2) before flipping sprint_status

  Scenario: --assume-ack proceeds when the CI token is set
    Given a closable sprint with all stories terminal
    And CLEARGATE_CI_ACK is set to exactly "1"
    When close_sprint.mjs runs with --assume-ack
    Then the guard is satisfied and the close pipeline proceeds
    And it exits 0

  Scenario: the ordinary no-flag close path is unaffected
    Given a closable sprint whose report exists
    And CLEARGATE_CI_ACK is unset
    When close_sprint.mjs runs WITHOUT --assume-ack
    Then it prints "Review the report, then confirm close by re-running with --assume-ack"
    And it exits 0

  Scenario: enforcement §15 states the true narrow CLEARGATE_ADVISORY scope
    Given the shipped enforcement doc after this story
    When I read §15 CLEARGATE_ADVISORY
    Then it names only the sprint preflight and sprint-init story-file-assertion gates
    And it explicitly states it does not soften file-surface, decomposition, lifecycle-init, or sprint-close gates
    And the phrase "all gate failures in the CLI" no longer appears

  Scenario: the close-guardrail docs describe the CI-token guard
    Given the shipped enforcement §12.3 and both CLAUDE.md copies after this story
    When I read the sprint-close guardrail text
    Then each states close_sprint.mjs refuses --assume-ack unless CLEARGATE_CI_ACK=1
    And each states CLEARGATE_CI_ACK is CI-only and the orchestrator must not set it
```

### 2.2 Verification Steps (Manual)
- [ ] `CLEARGATE_SKIP_LIFECYCLE_CHECK=1 CLEARGATE_SKIP_WORKTREE_CHECK=1 CLEARGATE_SKIP_MERGE_CHECK=1 node .cleargate/scripts/close_sprint.mjs <sprint-id> --assume-ack` with `CLEARGATE_CI_ACK` unset → non-zero exit, stderr names `CLEARGATE_CI_ACK`.
- [ ] Same command with `CLEARGATE_CI_ACK=1` prefixed → proceeds past the guard.
- [ ] Run without `--assume-ack` → prints the "Review the report…" prompt and exits 0 (token irrelevant).
- [ ] `grep -n "all gate failures in the CLI" cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` → no match; §15 enumerates the two true sites.
- [ ] `node --test --import tsx cleargate-planning/.cleargate/scripts/close_sprint.assume-ack-guard.node.test.ts` → green.
- [ ] `cd cleargate-cli && npm test && npm run test:integration` → green (harness token propagates).
- [ ] Confirm canonical, live (`/.cleargate`), and payload copies of every touched `cleargate-planning/**` file are byte-identical after `npm run prebuild` + hand-sync.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (canonical) | `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — add the `--assume-ack` CI-token guard after arg parse (line 177); also fixes the stale `:639`→`:648` comment claiming a nonexistent `CLEARGATE_ADVISORY` warn-and-continue path (G8-3) |
| Primary File (canonical) | `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — narrow §15 advisory scope (**`:544`**, corrected from the story's stale `:540` — G8-4); document guard in §12.3 (**`:459-461`**, corrected from the story's stale `:455-457`, which are §12.2 Steps A/B — G8-4) |
| ⊕ Primary File (canonical, self-amendment AD#2) | `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — §14.1 `:503-504` + §14.2 `:511-512` collapse the false "Enforcement (v2)/Advisory (v1)" bullet pairs to a single always-enforced statement each; the orchestrator's 2026-07-27 M2 amendment (AD#2) assigned this region to STORY-051-08 because `close_sprint.mjs` has zero `CLEARGATE_ADVISORY` reads and these bullets directly contradict the §15 sentence landing in the same commit |
| Related File (canonical) | `cleargate-planning/CLAUDE.md` — sprint-close guardrail wording (lines 36, 63) |
| Related File (root) | `CLAUDE.md` — sprint-close guardrail wording inside CLEARGATE block (lines 158, 185) + meta-repo guardrail (line 126, **outside** the bounded block — G8-7) |
| ⊕ New File (self-amendment AD#1 — relocated) | `cleargate-cli/test/scripts/close-sprint-assume-ack-guard.node.test.ts` — node:test for the guard. **Relocated from the originally-spec'd `cleargate-planning/.cleargate/scripts/close_sprint.assume-ack-guard.node.test.ts`**: that path is un-globbed by `cleargate-cli/scripts/run-default-tests.mjs:23` (nothing globs `.cleargate/scripts/`) and `copy-planning-payload.mjs` applies no file filter, so `npm run prebuild` would have shipped a `.node.test.ts` into the npm payload — a dead gate, the exact defect STORY-051-09 R9 deletes elsewhere. Same correction pattern the orchestrator accepted for STORY-051-05 in M1. Orchestrator-ratified 2026-07-27 (AD#1). |
| Related File (canonical) | `cleargate-planning/.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` — add `CLEARGATE_CI_ACK: '1'` to `baseEnv()` (`:82-95`) |
| Live mirror | `.cleargate/scripts/close_sprint.mjs` (hand-synced from canonical) |
| Live mirror | `.cleargate/knowledge/cleargate-enforcement.md` (hand-synced) |
| Live mirror | `.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` (hand-synced) |
| Payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` (regenerated by `npm run prebuild`) |
| Payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` (regenerated by prebuild) |
| Payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` (regenerated by prebuild) |
| Payload mirror | `cleargate-cli/templates/cleargate-planning/CLAUDE.md` (regenerated by prebuild) |
| Test harness (cleargate-cli repo — separate git) | `cleargate-cli/package.json` — prefix `test`, `test:node`, `test:integration`, `test:file`, `test:node:file` with `CLEARGATE_CI_ACK=1` |
| ⊕ Related File (cli repo, self-amendment AD#3) | `cleargate-cli/src/cli.ts:347` — `--assume-ack` option help string gains the `CLEARGATE_CI_ACK` requirement (string literal only, no control-flow change; orchestrator-ratified 2026-07-27) |
| ⊕ Related File (cli repo, self-amendment AD#3) | `cleargate-cli/src/commands/sprint.ts:788` — the "sprint not closed" message gains the `CLEARGATE_CI_ACK` requirement, appended after the existing `sprint not closed` prefix (kept byte-identical — two tests assert on that substring, G8-8) |
| New Files Needed | Yes — one test file (`close-sprint-assume-ack-guard.node.test.ts`), landing only in the cli repo per AD#1 (no canonical/live/payload copy) |
| Auto-regenerated (whitelisted) | `cleargate-planning/MANIFEST.json` — payload checksums refreshed by prebuild; admitted by `surface-whitelist.txt`, no manual edit |
| Grounding refs (read-only) | `cleargate-cli/src/util/gate-mode.ts:14`, `cleargate-cli/src/commands/sprint.ts:1715` (corrected from the story's stale `:1681` — G8-4, shifted by STORY-051-05's docstring sweep), `cleargate-planning/.cleargate/scripts/init_sprint.mjs:140`, `cleargate-planning/.claude/hooks/pending-task-sentinel.sh:129` |

### 3.2 Technical Logic

**Guard in `close_sprint.mjs`.** Arg parsing at lines 173-177 already computes `const assumeAck = args.includes('--assume-ack') || reportBodyStdin;` (line 177). Immediately after that line, before the `sprintDir` existence check, add a fail-fast guard scoped to the explicit flag (not to `reportBodyStdin`):

```
if (args.includes('--assume-ack') && process.env.CLEARGATE_CI_ACK !== '1') {
  process.stderr.write(
    'Error: --assume-ack is reserved for CI. Set CLEARGATE_CI_ACK=1 in an automated CI\n' +
    'environment to use it. A conversational orchestrator MUST NOT pass --assume-ack\n' +
    'or set CLEARGATE_CI_ACK (enforcement §12.3).\n'
  );
  process.exit(2);
}
```

Only the exact string `'1'` passes (matches `isAdvisory()` truthiness — `'0'`, `'true'`, `''`, undefined all refuse). Exit code `2` matches the existing `usage()` reserved-flag convention (line 123). The guard targets `args.includes('--assume-ack')` specifically so the `--report-body-stdin` programmatic path (which also sets `assumeAck`) is left as-is (§1.3). Placement before `sprintDir` resolution keeps it a fast policy refusal.

**Enforcement §15 narrow (line 540).** Replace "all gate failures in the CLI (`cleargate sprint preflight`, `cleargate sprint init`, etc.) are **downgraded**…" with the true scope: `CLEARGATE_ADVISORY=1` downgrades gate failures at the `cleargate sprint preflight` gate (`sprint.ts` `isAdvisory()`, `gate-mode.ts:14`) and the `cleargate sprint init` story-file assertion (`init_sprint.mjs:140`) — and does NOT soften the file-surface, decomposition, lifecycle-init/reconciliation, or sprint-close gates, and is not a universal enforcement-strength knob. (Grounding: `isAdvisory()` is called at exactly one CLI site, `sprint.ts:1681`; `init_sprint.mjs:140` honors the raw env for the story-file assertion — the audit's "~2 sites.") Do not restate a bare "preflight-only" claim (that would underclaim the init site — see §1.4 NEW question).

**Enforcement §12.3 (Flag Reservation, lines 455-457).** Append: `close_sprint.mjs` mechanically refuses `--assume-ack` (exit 2) unless `CLEARGATE_CI_ACK=1` is set; the token is CI-only, and the conversational orchestrator MUST NOT set it. This turns "never pass `--assume-ack` autonomously" from instruction into mechanism.

**CLAUDE.md guardrails.** Root `CLAUDE.md` (lines 126, 160, 185) and canonical `cleargate-planning/CLAUDE.md` (lines 36, 63): after "Never pass `--assume-ack` autonomously," add a clause — `close_sprint.mjs` now refuses `--assume-ack` unless `CLEARGATE_CI_ACK=1` (CI-only); never set that token in a conversational session. Note: grounding confirms neither `CLAUDE.md` contains a `CLEARGATE_ADVISORY` "all CLI gates" claim, so no advisory-scope narrowing is needed in `CLAUDE.md` — only the `--assume-ack` guard clause.

**Test harness token.** Every existing close spawn helper spreads `...process.env` (e.g. `test_close_sprint_v21.integration.node.test.ts:240`, `close_sprint.deferred-verify.red.node.test.ts:84`), so a parent-process `CLEARGATE_CI_ACK=1` propagates to the child `close_sprint.mjs`. Set it once per harness: prefix the `cleargate-cli/package.json` test scripts (`CLEARGATE_CI_ACK=1 node scripts/run-default-tests.mjs …`, and the `tsx --test` scripts), and add `CLEARGATE_CI_ACK: '1'` to the standalone red test's `baseEnv()` so it self-runs. The cli integration test invokes the outer live copy (`REPO_ROOT/.cleargate/scripts/close_sprint.mjs`, `REPO_ROOT = resolve(__dirname,'..','..','..')`), so the live-copy guard must land in the same commit that sets the harness token.

**New guard test.** node:test + `spawnSync`, self-isolating tmpdir + skip-env (pattern copied from `close_sprint.deferred-verify.red.node.test.ts`). The refuse-case must build a child env that does NOT carry `CLEARGATE_CI_ACK=1` (delete it from the spread) so it exercises the refusal branch even when the harness sets the token globally.

### 3.3 API Contract (if applicable)

| Invocation | Precondition | Result | Exit |
|---|---|---|---|
| `close_sprint.mjs <id> --assume-ack` | `CLEARGATE_CI_ACK` ≠ `'1'` | stderr: reserved-for-CI error naming `CLEARGATE_CI_ACK`; no state change | 2 |
| `close_sprint.mjs <id> --assume-ack` | `CLEARGATE_CI_ACK` === `'1'` | close pipeline proceeds (unchanged behavior) | 0 (on success) |
| `close_sprint.mjs <id>` (no flag) | any `CLEARGATE_CI_ACK` | prints report-review prompt; halts | 0 |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| node:test — guard refusal | 1 | `--assume-ack` with `CLEARGATE_CI_ACK` scrubbed → exit 2, stderr matches `/CLEARGATE_CI_ACK/`. Child env must NOT inherit the harness `'1'`. |
| node:test — guard allow | 1 | `--assume-ack` + `CLEARGATE_CI_ACK=1` (+ skip-env) → exits 0, sprint_status flips. |
| node:test — no-flag path unaffected | 1 | no `--assume-ack`, token unset → prints "Review the report…" prompt, exit 0. |
| node:test — non-`'1'` values refused | 1 | `CLEARGATE_CI_ACK` ∈ {`'0'`,`'true'`,`''`} with `--assume-ack` → exit 2 (exact-`'1'` truthiness). |
| Regression (existing suites) | 0 new | Existing `cleargate-cli/test/**` close suites + standalone red test stay green via the harness token. |

### 4.2 Definition of Done (The Gate)
- [ ] Guard added to `close_sprint.mjs` (canonical) at ~line 177; exit 2 on `--assume-ack` without `CLEARGATE_CI_ACK=1`.
- [ ] Enforcement §15 narrowed to the two true honor sites; `grep "all gate failures in the CLI"` returns 0 in the enforcement doc.
- [ ] Enforcement §12.3 + root `CLAUDE.md` + canonical `cleargate-planning/CLAUDE.md` state the CI-token guard and its CI-only nature.
- [ ] New `close_sprint.assume-ack-guard.node.test.ts` covers all four §4.1 guard cases; `node --test --import tsx` green.
- [ ] `CLEARGATE_CI_ACK=1` set in `cleargate-cli/package.json` test scripts and the standalone red test `baseEnv()`; full cli suite + standalone tests green.
- [ ] Gherkin scenarios all pass and each §1.2 requirement is covered by a scenario.
- [ ] Canonical → live (`/.cleargate`) → payload (`npm run prebuild`) synced and byte-identical for every touched `cleargate-planning/**` file; `MANIFEST.json` refreshed by prebuild.
- [ ] No `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` behavior-switch tokens introduced.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/util/gate-mode.ts:14` — `isAdvisory()`, the sole `CLEARGATE_ADVISORY` env reader; establishes the exact-`'1'` truthiness the new guard mirrors.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:1681` — the one CLI `isAdvisory()` call (sprint preflight), the true honor site §15 must name.
- **Surface:** `cleargate-planning/.cleargate/scripts/init_sprint.mjs:140` — `process.env.CLEARGATE_ADVISORY === '1'` softens the sprint-init story-file assertion; the second true honor site (the reason "preflight-only" would underclaim).
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs:173-177` — arg parse where `assumeAck` is computed (line 177); the guard slots in directly after. `usage()` at lines 115-123 exits 2 (reserved-flag convention reused).
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts:82-110` — `baseEnv()` (line 82) + `...process.env` (line 84) + `--assume-ack` `spawnSync` (line 110) pattern the new test reuses; the file needing the token added.
- **Surface:** `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:540` (§15) + `:455-457` (§12.3) — the exact doc lines edited.
- **Coverage of this requirement:** partial — the doc narrowing and the test-pattern reuse are ~90% existing surface; the CI-token guard branch and `CLEARGATE_CI_ACK` are net-new (small: one `if` block + doc clauses).

## Why not simpler?

- **Smallest existing surface that could carry this:** the `assumeAck` computation at `close_sprint.mjs:177` (guard) plus the §15/§12.3 doc lines (scope + reservation). No new module, no new subsystem — the guard is a single fail-fast `if` and the rest is prose + a co-located test.
- **Why isn't extension / parameterization / config sufficient?** The "never pass `--assume-ack` autonomously" rule is today pure instruction; making it real requires an actual runtime check — no existing predicate reads a close-time CI token, so the branch is genuinely new (but tiny). A configurable enforcement-strength knob is explicitly forbidden by the epic (only `CLEARGATE_ADVISORY` is sanctioned, and Q1 resolved it must stay narrow); `CLEARGATE_CI_ACK` is a single boolean CI gate, not a new strength axis. The §15 correction is a factual fix to an overclaim, which cannot be expressed as config — the doc has to state what the code actually does.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.