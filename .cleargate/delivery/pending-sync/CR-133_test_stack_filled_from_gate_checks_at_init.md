---
cr_id: CR-133
parent_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,init
status: Draft
approved: false
context_source: SPRINT-46 Goal check (d) sandbox run 2, finding S22 and run 1 finding B7 second half (.cleargate/field-trials/2026-11-sandbox-s46.md; ORCHESTRATOR_FINDINGS.md B7); iteration-3-scoping.md §7 ('S22 ... none — new intake line (fill rows from gate-checks.json at init, S)'); filed under the owner's /goal delegation 2026-11-15
created_at: 2026-11-15T11:36:28.840Z
updated_at: 2026-11-15T11:36:28.840Z
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
  last_gate_check: 2026-11-15T11:39:17Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-133: Fill sprint-context.md §Test Stack from gate-checks.json at sprint init

## 0.5 Open Questions

- **Question:** Which commands fill the rows? In the sandbox `gate-checks.json` held `qa.test "make check"` and `qa.typecheck "go vet ./..."`, while the orchestrator hand-wrote `go test ./...` / `go vet ./...` into the table (S22).
- **Recommended:** Copy the configured values verbatim: Backend runner <- `qa.test`, Typecheck command <- `qa.typecheck`. `gate-checks.json` is what the pre-gate and QA actually run (`pre_gate_common.sh:4`: "the commands to run come from gate-checks.json, never from stack detection"), so the table must not disagree with it. A hand-written `go test ./...` that differs from the gate is the thing to avoid.
- **Human decision:** _open_
- **Question:** Rows with no source (Frontend runner, Red-test naming) stay as the stub?
- **Recommended:** Yes, leave them stubbed; STORY-066-20 / D.5 owns red-file naming for Go (`*_red_test.go`). Do not invent values.
- **Human decision:** _open_
- **Question:** Precedence against STORY-031-05 (carry the last populated §Test Stack forward) when both apply?
- **Recommended:** gate-checks.json first, prior sprint's table second, stub last; a non-empty `gate-checks.json` value is the repo's current truth.
- **Human decision:** _open_
- **Question:** When `qa.test` is the empty string (neutral default; unresolved stack)?
- **Recommended:** Leave the stub and keep the existing "test_stack unresolved" advisory.
- **Human decision:** _open_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "Unpopulated is the correct state at init" for a repo whose `gate-checks.json` already names the test and typecheck commands. `init_sprint.mjs` copies the §Test Stack table from the template verbatim (stub rows such as _(e.g. `go test ./...`)_), so the orchestrator must hand-fill it at the wave-1 barrier.

**New Logic (The New Truth):**
- At `init_sprint.mjs` time, when `.cleargate/scripts/gate-checks.json` has a non-empty `qa.test` and/or `qa.typecheck`, the generated `sprint-context.md` §Test Stack rows "Backend runner" and "Typecheck command" carry those values. Empty values leave the stub and the existing advisory. Idempotent on re-init (`--force`), and a table the orchestrator already edited is not overwritten without `--force`.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: [[STORY-031-05]] (Test Stack carry-forward at sprint init; same code path, decide precedence)
- [ ] Invalidate/Update Epic: none
- [x] Database schema impacts? No.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:311-345` — writes `sprint-context.md` from the template, substitutes frontmatter and the Sprint Goal, leaves the §Test Stack table as shipped.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:31-46` — the stub table and the "If unresolved at init" paragraph.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json:3-7` — `qa.typecheck`, `qa.test` (the repo's configured commands).
- **Surface:** `cleargate-cli/src/commands/init.ts:422-444` — `detectTestStack`/`applyTestStack` rewrite `gate-checks.json` at `cleargate init`, but never touch sprint-context; prints "Test stack unresolved — populate sprint_context.md §Test Stack" when nothing resolves.
- **Why this CR extends rather than rebuilds:** init already resolves the stack into `gate-checks.json`; this only reads that file at sprint init to fill the table. No new detection.

## Prior work

- [[STORY-031-05]] (carry-forward at init; Draft, SPRINT-43 label), [[STORY-031-03]] (Test Stack as single source for runner and known failures), [[CR-045]] (sprint-context written at init). None fills the table from `gate-checks.json`.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs`
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md` (only if the stub text needs a marker the fill can key on)
- `cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts` (existing; extend)

Live `.cleargate/scripts` and templates re-sync after merge (dogfood split).

## Task Breakdown

- [ ] Red tests: non-Node fixture with `qa.test "make check"` / `qa.typecheck "go vet ./..."` -> Scenario 1; empty values -> Scenario 2; re-init -> Scenario 3
- [ ] Read `gate-checks.json` in `init_sprint.mjs` and substitute the two rows (fail-open: any read/parse error leaves the stub) -> Scenario 1, 2
- [ ] Decide and implement precedence with STORY-031-05's carry-forward -> Scenario 3
- [ ] Update the template's "If unresolved at init" paragraph

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npx tsx --test test/scripts/init-sprint-context.red.node.test.ts`

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Values present, values empty and re-init are different outcomes. |
| Interfaces | F | One generated file. |
| Data | T | Node vs non-Node command strings. |
| Rules | T | Empty config must not invent content; an edited table survives re-init. |

```gherkin
Feature: sprint-context §Test Stack reflects gate-checks.json

  @paths @data
  Scenario: A configured gate fills the table
    Given gate-checks.json has qa.test "make check" and qa.typecheck "go vet ./..."
    When init_sprint.mjs SPRINT-99 runs
    Then sprint-context.md Backend runner reads "make check" and Typecheck command reads "go vet ./..."
    And Frontend runner and Red-test naming stay stubbed

  @rules
  Scenario: An unconfigured gate leaves the stub
    Given qa.test and qa.typecheck are empty strings
    When init_sprint.mjs runs
    Then the table is the stub and the "test_stack unresolved" advisory still prints

  @rules
  Scenario: Re-init does not overwrite an edited table
    Given the orchestrator edited the Backend runner row
    When init_sprint.mjs runs again without --force
    Then the row is unchanged
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | row substitution helper |
| Integration tests | 2 | real fixture repo via `init_sprint.mjs`, no mocks |
| E2E / acceptance tests | 0 | Observed in the Goal check (d) re-run (Go sandbox) |

---

## Context Source

**context_source:** SPRINT-46 Goal check (d), S22 and B7 (second half); iteration-3-scoping.md §7.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
