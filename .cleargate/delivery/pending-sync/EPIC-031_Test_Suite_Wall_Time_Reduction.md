---
epic_id: EPIC-031
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-31
carry_over: false
area: tests,test-runner,sprint-execution,dx
status: Draft
approved: false
ambiguity: 🟡 Medium
context_source: |
  Direct user direction 2026-05-24 during execution-loop slowness analysis.
  User: "i think running tests take the most time" → "can you plan this fix
  into a small sprint and ship?"

  Analysis (this conversation) measured concrete numbers:
  - SPRINT-30 STORY-070-01 QA-Verify ran full suite (2002 tests, ~10min)
  - SPRINT-30 STORY-071-01 QA-Verify ran full suite (1974 tests + 138 known-
    failing baseline noise)
  - Per-scenario baseline cost ~100-200ms × 204 cleargate-cli files = ~10min
    wall time at concurrency=1
  - --test-concurrency=1 is global because of FK-constraint conflicts on DB
    integration tests (FLASHCARD 2026-05-18 · #node-test #migration)

  Verified file census 2026-05-24 (this conversation):
  - cleargate-cli/test: 204 *.node.test.ts files, ONLY 1 (bootstrap-root)
    actually imports pg/postgres/drizzle/Pool. 203/204 = 99.5% serialized for
    no reason.
  - mcp/src + mcp/test: 68 *.node.test.ts files, 43 touch DB (real serialization
    need), 25 are pure unit.
  - admin/: 34 files (out of scope for this Epic — jsdom-bootstrapped, different
    cost profile).

  EPIC-028 (Vitest Elimination) shipped 2026-05-18. EPIC-031 inherits the
  --test-concurrency=1 default it established and SPLITS the runner without
  reintroducing vitest.
proposal_gate_waiver: true
proposal_gate_waiver_reason: |
  Direct user ask with sharp intent ("plan this fix into a small sprint and
  ship") immediately following the orchestrator's ranked-fix analysis in the
  same conversation. Inline references: cleargate-cli/package.json,
  --test-concurrency=1, 204-file count, 138-baseline-fail count.
  Recorded per memory feedback_proposal_gate_waiver.md.
owner: sandrinio
target_date: 2026-05-31
created_at: 2026-05-24T00:00:00Z
updated_at: 2026-05-24T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
stamp_error: no ledger rows for work_item_id EPIC-031
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-24T18:14:20Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-24T18:14:21Z
---

# EPIC-031: Test Suite Wall-Time Reduction — Split Runner + Scoped QA

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Cut sprint-execution wall time by halving full-suite runtime. Two levers: (1) split cleargate-cli/ test runner into test:unit (parallel, default concurrency) + test:db (serial concurrency=1) so the 203/204 non-DB tests stop being serialized behind 1 DB test; (2) make QA-Verify default to scoped tests (touched files only) and switch the default reporter from spec to dot to reduce stdout context burden.</objective>
  <architecture_rules>
    <rule>cleargate-cli/ runner split: test = test:unit && test:db. test:unit globs all *.node.test.ts EXCEPT *.db.node.test.ts; runs with default concurrency (parallel). test:db globs *.db.node.test.ts only; keeps --test-concurrency=1. Fallback: TEST_REPORTER env var can override default reporter back to spec for debugging.</rule>
    <rule>DB-test tagging: rename file to *.db.node.test.ts. In cleargate-cli/, ONLY bootstrap-root.node.test.ts qualifies as of 2026-05-24 (verified census). Future DB-touching tests use the .db. infix. Adopt the same convention in mcp/ in a follow-up (out of scope for SPRINT-31).</rule>
    <rule>Reporter default flips spec → dot in cleargate-cli/package.json. dot prints one char per test (✓/✗/-) — ~10× less stdout. spec remains opt-in via TEST_REPORTER=spec npm test for debugging.</rule>
    <rule>QA-Verify scope policy: scoped tests are the default. Full suite runs ONLY when (a) story §3.1 file surface touches shared test-harness or runner infra (cleargate-cli/package.json scripts, .cleargate/scripts/, gate-checks.json), OR (b) Dev's commit did not include a clean `npm test` run. Codified in cleargate-planning/.claude/agents/qa.md §"Test scope".</rule>
    <rule>No vitest residue. The check:no-vitest script established by EPIC-028 still passes after this Epic. New scripts are pure node:test/tsx.</rule>
    <rule>mcp/ runner split is out of scope for SPRINT-31. Recorded as follow-up; the 43-file DB-test set there needs its own M-plan because mcp/ uses `node --test --import tsx/esm` (not `tsx --test`).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/package.json" action="modify" />
    <file path="cleargate-cli/test/commands/bootstrap-root.node.test.ts" action="rename-to-db" />
    <file path="cleargate-planning/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-planning/.cleargate/templates/sprint_context.md" action="modify" />
    <file path=".cleargate/scripts/gate-checks.json" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

The five-dispatch sprint execution loop spends most of its wall time on `npm test`. SPRINT-30 ledger data: STORY-070-01 QA-Verify ran ~10min, STORY-071-01 QA-Verify ran ~10min — most of that is the full 204-file suite at concurrency=1. The serialization exists because EPIC-028 set `--test-concurrency=1` to prevent FK-constraint conflicts on DB integration tests. Verified census shows ONLY 1 of 204 cleargate-cli test files actually touches Postgres — the other 203 pay a serialization tax they don't need.

**What's the solution?**

Two-prong:

1. **Split the runner.** `test:unit` glob excludes `*.db.node.test.ts` and runs with default concurrency (parallel, num-CPU workers). `test:db` runs only `*.db.node.test.ts` at concurrency=1. Single DB file gets renamed to the new convention.
2. **Reduce QA-Verify scope by default + thinner reporter.** Agent prompt says full-suite is opt-in; reporter default flips to `dot`.

**Success metrics:**

- `npm test` wall time in cleargate-cli/ drops by ≥ 50% on an 8-core laptop (target: ~10min → ~3min).
- QA-Verify dispatches in the next sprint run scoped tests by default; full-suite invocations are rare and justified in the QA report.
- Reporter stdout size drops ≥ 5× (measured by piping `npm test` to `wc -c`).
- check:no-vitest still passes; no new test-runner devDeps introduced.

## 2. Scope Boundaries

**IN-SCOPE**

- [ ] cleargate-cli/package.json runner split (test:unit + test:db + test wrapper).
- [ ] Rename `bootstrap-root.node.test.ts` → `bootstrap-root.db.node.test.ts`.
- [ ] Reporter default → `dot`; `TEST_REPORTER=spec` env opt-out.
- [ ] Update `cleargate-planning/.claude/agents/qa.md` with scoped-tests-default policy.
- [ ] Update `cleargate-planning/.cleargate/templates/sprint_context.md` Cross-Cutting Rules section with one bullet codifying the new convention.
- [ ] Update `.cleargate/scripts/gate-checks.json` test invocation if it currently calls `npm test` directly.
- [ ] Verify wall-time drop with a recorded `time npm test` before and after.

**OUT-OF-SCOPE**

- mcp/ runner split (43 DB files + tsx/esm import style — separate epic).
- admin/ runner split (34 jsdom-bootstrapped files — separate epic).
- Quarantining the 138 known-failing baseline tests (separate effort, surface volatility risk).
- Commit-SHA-based test-result caching (deferred — needs cache invalidation design).
- Replacing tsx with `node --experimental-strip-types` (deferred — separate perf CR).
- Forcing Sonnet on mechanical agents (separate orchestration concern; tracked in 2026-05-23 conversation, not this Epic).

## 3. The Reality Check

| Constraint | Detail |
|---|---|
| **DB FK conflicts are real** | FLASHCARD 2026-05-18 · #node-test established `--test-concurrency=1` to prevent FK collisions. test:db keeps the serial setting. |
| **Single DB test file in cleargate-cli today** | bootstrap-root.node.test.ts is the only file importing pg/postgres/drizzle/Pool (verified 2026-05-24). Any new DB-touching test must use the `.db.node.test.ts` suffix going forward. |
| **66 cleargate-cli files use child_process** | Some may have implicit ordering deps via fs writes to shared temp paths. Story 01 includes a smoke check: if `test:unit` shows new flakes, revert to serial and quarantine the offending file(s) with `.db.` naming. |
| **Existing test-reporter contracts** | `tsx --test --test-reporter=spec` is referenced in script-incidents JSON and one QA report. Verify nothing parses spec-formatted output before flipping to dot. |
| **Live vs canonical .claude/ split** | qa.md changes land in cleargate-planning/.claude/agents/qa.md (canonical). DoD includes a `cleargate init` re-sync of the live `/.claude/` instance, per CLAUDE.md dogfood split rule. |

### 3.5 Existing Surfaces

- `cleargate-cli/package.json` `test`, `test:file`, `test:node`, `test:node:file` scripts — current runner config.
- `cleargate-cli/test/commands/bootstrap-root.node.test.ts` — sole DB-touching file (verified 2026-05-24).
- `cleargate-planning/.claude/agents/qa.md` `## Capability Surface` + `## Lane-Aware Playbook` sections — where scoped-tests policy lives.
- `cleargate-planning/.cleargate/templates/sprint_context.md` `## Cross-Cutting Rules` section.
- `.cleargate/scripts/gate-checks.json` — `test` entry maps to `cd cleargate-cli && npm test`.

### 3.6 Why not simpler?

A one-line tweak (`--test-concurrency=0`) without splitting would break the 1 DB test that exists. A pure agent-prompt tweak (scoped-tests-only) cuts QA-Verify time but leaves Developer's full-suite commit gate untouched. The two-story split is the smallest change that addresses both halves of the wall-time spend without losing the FK-safety property.

## 4. Technical Grounding

**Verified files (2026-05-24):**

| Path | Touched? | How |
|---|---|---|
| `cleargate-cli/package.json` | Modified | Add test:unit / test:db, flip reporter default, wire test wrapper |
| `cleargate-cli/test/commands/bootstrap-root.node.test.ts` | Renamed | → `bootstrap-root.db.node.test.ts` (git mv preserves history) |
| `cleargate-planning/.claude/agents/qa.md` | Modified | Add `## Test scope policy` heading; default = scoped |
| `cleargate-planning/.cleargate/templates/sprint_context.md` | Modified | One bullet in Cross-Cutting Rules |
| `.cleargate/scripts/gate-checks.json` | Reviewed | Confirm `test` entry still works after split |

**Data changes:** None. No schema migrations, no state.json shape changes.

## 5. Acceptance Criteria

### Scenario 1: test:unit runs in parallel
```gherkin
Given cleargate-cli/package.json defines test:unit
When the operator runs `npm run test:unit`
Then node:test executes with --test-concurrency=0 (default = num CPUs)
And no test file matching *.db.node.test.ts is included
And wall time on an 8-core machine is ≤ 50% of the previous full-suite serial time
```

### Scenario 2: test:db runs serially
```gherkin
Given cleargate-cli/package.json defines test:db
When the operator runs `npm run test:db`
Then node:test executes with --test-concurrency=1
And ONLY *.db.node.test.ts files are included
And bootstrap-root.db.node.test.ts passes (FK constraints intact)
```

### Scenario 3: `npm test` chains both
```gherkin
Given cleargate-cli/package.json defines test = "npm run test:unit && npm run test:db"
When the operator runs `npm test`
Then test:unit runs first, test:db runs second
And exit code is 0 only if both pass
```

### Scenario 4: dot reporter is default
```gherkin
Given cleargate-cli/package.json scripts default to --test-reporter=dot
When the operator runs `npm test` with no env overrides
Then stdout uses the dot reporter (one char per test)
And stdout byte count is ≤ 1/5 of the previous spec-reporter stdout
```

### Scenario 5: spec reporter remains opt-in
```gherkin
Given the operator sets TEST_REPORTER=spec
When the operator runs `npm test`
Then the spec reporter is used (verbose per-scenario output)
```

### Scenario 6: QA-Verify default scope
```gherkin
Given a Story whose §3.1 file surface does NOT touch cleargate-cli/package.json, .cleargate/scripts/, or gate-checks.json
When the QA-Verify agent is dispatched
Then the agent's first test invocation uses `npm run test:file -- <touched test files>` (scoped)
And the agent does NOT invoke `npm test` (full suite) unless Dev's commit lacks a clean full-run signal
```

### Scenario 7: QA-Verify full-suite opt-in
```gherkin
Given a Story whose §3.1 file surface DOES touch cleargate-cli/package.json or test-harness infra
When the QA-Verify agent is dispatched
Then the agent runs the full `npm test`
And the QA report explicitly justifies the full-suite run in the Notes section
```

## 6. AI Interrogation Loop

Resolved at draft time — no remaining open questions for the human. (Ambiguity 🟡 Medium → 🟢 Low after Brief approval.)

---

**Ambiguity Gate**

- [x] Sprint goal verbatim in plan §0
- [x] Each story has §3.1 file surface
- [x] Cross-cutting rule(s) drafted
- [x] No mcp/ scope creep
- [ ] Human acks the bootstrap-root rename as the sole DB-tagged file (no surprise DB imports missed)
