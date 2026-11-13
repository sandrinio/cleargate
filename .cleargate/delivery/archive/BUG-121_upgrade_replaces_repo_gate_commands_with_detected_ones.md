<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-121_upgrade-replaces-repo-gate-commands-with-detected-ones.md

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
bug_id: BUG-121
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: upgrade,init,gate-checks
status: Completed
severity: P1-High
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13 (dry run hid the change; QA commands switched mid-project), reproduced on a pristine copy of the field repo with the published 0.30.0 binary for both `upgrade --yes` and `init` alone; code grounding at cli main b9fe36a: src/init/detect-test-stack.ts:146-180 applyTestStack writes qa.typecheck, qa.test and arch.typecheck unconditionally (empty string when detection fails); called from src/commands/init.ts:427-428 and src/commands/upgrade.ts:913-927 (BUG-037 restore)"
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
  last_gate_check: 2026-11-12T21:56:55Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "4374f46cd7b60916c80049769897e4e49418bb8cb7184faf79d43e699a89a29e"
---

# BUG-121: `upgrade` and re-running `init` replace a repo's own gate commands with detected ones

### Open Questions

- **Question:** Whose value wins for `qa.test`, `qa.typecheck` and `arch.typecheck` when `gate-checks.json` already has one?
- **Recommended:** The repo's. Read the three fields from the file on disk before anything writes it. After `upgrade` writes upstream's file, and in `init` when the file exists, write each non-empty prior value back. Run detection only for fields that were empty. A fresh install is unchanged (detection fills all three).
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should a value that was empty and is now filled by detection be announced?
- **Recommended:** Yes, in both the dry run and the real run: `[upgrade] gate-checks.json: qa.test "" → "go test ./..." (detected); kept qa.typecheck "make lint"`. `init` prints the same line instead of `Skipped (exists) .cleargate/scripts/gate-checks.json` when it changes the file.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Commands a repo set for its QA and Architect gates survive `upgrade` and a re-run of `init` (the 0.29.0 and 0.30.0 CHANGELOGs both tell users to re-run `init`). A change to those commands is shown in `--dry-run` and in the run's output.

**Actual Behavior:**
- `applyTestStack` (`src/init/detect-test-stack.ts:146-180`) assigns `qa.typecheck`, `qa.test` and `arch.typecheck` from detection unconditionally, or `""` when detection does not resolve.
- `upgrade` calls it after its `always` overwrite of `gate-checks.json` (`upgrade.ts:913-927`, the [[BUG-037]] restore), and `init` calls it on every run (`init.ts:427-428`), even after printing `Skipped (exists) .cleargate/scripts/gate-checks.json`.
- So a repo's `make check` becomes `go test ./...`. In a repo detection cannot read, the repo's command becomes `""` and QA records "skipped", the failure [[BUG-037]] was filed for.
- The dry run shows only `action=overwrite state=user-modified → clean`.
- In the field repo the fields had been `""` (QA skipped). After the upgrade QA ran `go test ./...` and `go vet ./...`, while the repo's own check is `make check` (lint, api-check, test, seccheck, licences, vulncheck). Nothing in the dry run or the upgrade notes announced the change.

## 2. Reproduction Protocol
1. In a Go repo installed at 0.28.0, set `qa.test` to `make check`, and `qa.typecheck` and `arch.typecheck` to `make lint`, in `.cleargate/scripts/gate-checks.json`.
2. Copy A: `cleargate upgrade --dry-run | grep gate-checks`, then `cleargate upgrade --yes`.
3. Copy B: `cleargate init` only.
4. In each, run `jq -c '{t:.qa.test,tc:.qa.typecheck,a:.arch.typecheck}' .cleargate/scripts/gate-checks.json`.

Edge conditions:
- A fresh install (no `gate-checks.json`) still gets detected commands.
- An empty field is still filled by detection, and the run says so.
- A repo detection cannot read keeps its own commands rather than getting `""`.

## 3. Evidence & Context
Reproduced 2026-11-13 on a pristine copy of the field repo, published 0.30.0 binary:
```
# upgrade --dry-run
[dry-run] .cleargate/scripts/gate-checks.json  action=overwrite  state=user-modified → clean
# upgrade --yes
[upgrade] re-applied repo test stack: go test ./...
qa.test=go test ./... qa.typecheck=go vet ./...        # were "make check" / "make lint"
# init alone, on a second copy
[cleargate init] Skipped (exists) .cleargate/scripts/gate-checks.json
[cleargate init] Test stack: go test ./...
{"qa_test":"go test ./...","qa_tc":"go vet ./...","arch_tc":"go vet ./..."}   # were make check / make lint / make lint
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/init/detect-test-stack.ts` `applyTestStack` (fill only empty fields; take prior values).
- `cleargate-cli/src/commands/upgrade.ts` ~:913 (capture the three fields before the `always` overwrite; dry-run line).
- `cleargate-cli/src/commands/init.ts` ~:427 (report a change instead of "Skipped (exists)").
- Tests: `test/commands/upgrade-preserves-gate-commands.node.test.ts` and the init test-stack tests.

**Do NOT modify:** `overwrite_policy: always` for `gate-checks.json` (upstream still owns its schema); the doctor sha classification ([[BUG-091]]).

## Task Breakdown
- [ ] QA-Red: the scenarios below for `upgrade` and `init`.
- [ ] `applyTestStack` keeps non-empty values; upgrade passes the pre-overwrite values.
- [ ] Dry-run and run output name each changed field.
- [ ] Typecheck and the gate-command tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/gate-commands-kept.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | `upgrade` and `init` both write the file |
| Interfaces | T | upgrade and init are separate commands |
| Data | T | set, empty, and undetectable values behave differently |
| Rules | T | the repo's own command always wins over detection |

```gherkin
Feature: A repo's own gate commands survive upgrade and init

  @paths @rules
  Scenario Outline: Set commands are kept
    Given gate-checks.json with qa.test "make check" and qa.typecheck "make lint" in a Go repo
    When <command> runs
    Then qa.test is "make check" and qa.typecheck is "make lint"

    Examples:
      | command                  |
      | cleargate upgrade --yes  |
      | cleargate init           |

  @data
  Scenario: Empty commands are filled and announced
    Given gate-checks.json with qa.test "" in a Go repo
    When cleargate upgrade --yes runs
    Then qa.test is "go test ./..." and the output names qa.test "" → "go test ./..."

  @data @rules
  Scenario: A repo detection cannot read keeps its commands
    Given a repo with no recognised test stack and qa.test "./run-tests.sh"
    When cleargate init runs
    Then qa.test is "./run-tests.sh"

  @interfaces
  Scenario: The dry run names the change
    Given gate-checks.json with qa.test ""
    When cleargate upgrade --dry-run runs
    Then it prints a line naming qa.test and the detected command
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per scenario row |
| Integration tests | 1 | built CLI, `init` then `upgrade` on a temp Go repo, no packageRoot seam |
| E2E / acceptance tests | 0 | the next field upgrade |

---

## Prior work

- [[BUG-037]] (Completed): upgrade blanked the detected commands; its fix re-runs detection, which is what now replaces a repo's own commands.
- [[CR-077]] (Completed): introduced repo-derived test-stack commands.
- [[BUG-091]] (Draft): doctor misclassifies a pristine gate-checks.json; same file, different defect.

## Context Source

**context_source:** field upgrade test 2026-11-13, reproduced for `upgrade --yes` and `init` on pristine copies of the field repo; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
