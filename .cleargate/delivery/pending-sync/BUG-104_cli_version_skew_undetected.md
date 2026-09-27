---
bug_id: BUG-104
parent_ref: CR-009
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: cli-resolver
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood run r1, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy"
approved_at: 2026-09-27T08:15:00Z
context_source: "Codex dogfood run r1 events and gate-check.log; verified codebase grounding at cli main f0c33f7: src/lib/readiness-predicates.ts:43-70 (parsePredicate throws 'unsupported predicate shape'), src/commands/doctor.ts:568-615 (emitResolverStatusLine), hook resolver blocks in scaffold/hosts/{claude,codex}/…/hooks/*.sh (CR-009 three-branch)"
created_at: 2026-09-27T08:15:00Z
updated_at: 2026-09-27T08:29:08Z
created_at_version: strategy-phase-pre-init
updated_at_version: 94da1ca3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:53:26Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-104
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:53:25Z
  sessions: []
---

# BUG-104: An older `cleargate` on PATH silently grades a newer scaffold, and the failure reads as a ClearGate defect

### Open Questions

- **Question:** Should the resolver refuse a PATH CLI whose version differs from the install pin, or only warn?
- **Recommended:** Warn only, and keep the CR-009 branch order unchanged, so an offline or pinned user is never locked out. Two changes:
  - **(a)** `doctor --session-start`'s resolver line compares the resolved CLI's `--version` with the install pin (`.cleargate/.install-manifest.json` `pin_version`, else the `# cleargate-pin:` line of the host's own hook). Hosts are `.claude/hooks/` or `.codex/hooks/`. On a mismatch it prints `cleargate CLI: PATH (global install 0.26.1) — ⚠ install pinned 0.27.0: gates may use predicates this CLI does not know; run npx cleargate@0.27.0 or upgrade`.
  - **(b)** `parsePredicate` reports an unknown bare-token predicate as `unknown predicate "<name>": this gate config needs a newer cleargate than the running <version>`, not `unsupported predicate shape: <name>`. Genuinely malformed shapes keep the old message.
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** When the `cleargate` CLI that runs is older than the scaffold it grades, the user or agent is told so: at session start, and in the gate failure itself.

**Actual Behavior:**
- The hook and agent resolver (repo dist → PATH `cleargate` → `npx cleargate@<pin>`) takes whatever `cleargate` is first on PATH, whatever its version.
- In the dogfood, the Codex agent's `zsh -lc` shell resolved the global published 0.26.1, while the hooks ran the sprint build.
- The hook graded both stories PASS (14 criteria). The agent's `cleargate gate check` said `❌ spidr-coverage: predicate error: Error: unsupported predicate shape: spidr-coverage`, and Codex reported it as "a ClearGate CLI defect".
- The session-start line said only `cleargate CLI: PATH (global install) — cleargate`.
- The resolver status line reads the pin only from `.claude/hooks/stamp-and-gate.sh`, so a Codex install can never show its pin. Its npx fallback line names `@cleargate/cli@<pin>`, while the hooks run `npx -y "cleargate@<pin>"`.

## 2. Reproduction Protocol
1. Have a global `cleargate` older than the scaffold, e.g. 0.26.1 while the repo was installed from a build whose gates use `spidr-coverage`.
2. In the installed repo, run `cleargate gate check <story>`. Observe `❌ spidr-coverage: predicate error: Error: unsupported predicate shape: spidr-coverage`.
3. Run `cleargate doctor --session-start`. Observe `cleargate CLI: PATH (global install) — cleargate` with no version or pin comparison.
4. On a Codex-only install with no PATH `cleargate`, observe the pin reported as `unknown` (`.claude/hooks/stamp-and-gate.sh` is absent).

Edge conditions:
- The dev build and the published build can share a version string, e.g. both 0.26.1; the unknown-predicate message (b) covers that case.
- The version probe must be fast (≤ 3 s timeout, as today) and never fail the banner.
- The repo-dist branch (`cleargate-cli/dist/cli.js`) is the meta-repo case and needs no comparison.

## 3. Evidence & Context
```
Dogfood r1 (codex agent shell, zsh -lc → /opt/homebrew/bin/cleargate = global 0.26.1):
$ cleargate gate check .cleargate/delivery/pending-sync/STORY-001-01_todo_add_list.md
Gate: story.ready-for-execution (enforcing)
❌ spidr-coverage: predicate error: Error: unsupported predicate shape: spidr-coverage
Same file, same moment, via the hook (sprint build): ✅ story.ready-for-execution passed (14 criteria)
Codex: "Both Story checks are blocked by a ClearGate CLI defect: the documented `spidr-coverage` predicate is registered by the gate configuration but rejected by the installed evaluator."

doctor.ts:586  stdout('cleargate CLI: PATH (global install) — cleargate');
doctor.ts:591  const hookPath = path.join(cwd, '.claude', 'hooks', 'stamp-and-gate.sh');
doctor.ts:613  stdout(`cleargate CLI: npx @cleargate/cli@${pinVersion} (cold-start ~600ms first call)`);
hooks:         CG=(npx -y "cleargate@0.26.1")
readiness-predicates.ts:44 "Throws with "unsupported predicate shape: <src>" on any unrecognized input."
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/doctor.ts` `emitResolverStatusLine`:
  - read the pin from the install manifest, else the host's own hook (`.claude/hooks/` or `.codex/hooks/`);
  - probe the resolved CLI's `--version` and print a mismatch warning;
  - name the npx package as the hooks do (`cleargate@<pin>`).
- `cleargate-cli/src/lib/readiness-predicates.ts` `parsePredicate`: the unknown bare-token message names the running version. Keep malformed-shape errors unchanged.
- Tests beside the doctor session-start and readiness-predicate tests.

**Do NOT modify:** the hook resolver blocks in `scaffold/hosts/**` (branch order stays; no hook byte changes, so no live re-sync); predicate semantics; gate-checks config.

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` §3 BUG-104 (errata §1 E10). The plan wins where it differs from this file.

- [ ] QA-Red: doctor-version-skew red (6)
- [ ] Resolver line version probe + pin sources + npx name; unknown bare-token predicate message
- [ ] Typecheck, targeted, doctor-session-start + readiness-predicates green

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/doctor-version-skew.red.node.test.ts` (solo), plus the readiness-predicates tests green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The resolver line has three successful branches (repo dist, PATH, npx), each reporting correctly |
| Interfaces | T | Two surfaces report skew: the session-start banner and the gate-check predicate error |
| Data | T | The pin comes from the install manifest, a Claude hook or a Codex hook |
| Rules | T | Skew warns and never blocks; a malformed predicate keeps its original error |

```gherkin
Feature: Version skew between the running CLI and the install is visible

  @paths @rules
  Scenario: A PATH CLI older than the pin is flagged at session start
    Given an install pinned 0.27.0 and a PATH cleargate reporting 0.26.1
    When cleargate doctor --session-start runs
    Then the resolver line names 0.26.1 and the 0.27.0 pin with an upgrade hint, and the banner exits 0

  @data
  Scenario: A Codex-only install reports its pin
    Given a --host codex install with no .claude/ directory and no PATH cleargate
    When the resolver line is emitted
    Then it names npx cleargate@<pin> read from .codex/hooks or the install manifest

  @interfaces
  Scenario: An unknown predicate names the version gap
    Given a gate criterion "spidr-coverage" that this CLI build does not know
    When the predicate is parsed
    Then the error says unknown predicate "spidr-coverage" and names the running CLI version

  @rules
  Scenario: A malformed predicate keeps its error
    Given the criterion "frontmatter().status == x"
    When it is parsed
    Then the error is "unsupported predicate shape: frontmatter().status == x"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario (doctor with injected spawn/fs seams; parser direct) |
| Integration tests | 0 | the session-start banner tests (existing) cover wiring |
| E2E / acceptance tests | 0 | observed in the SPRINT-41 Codex dogfood re-run |

---

## Prior work

- [[CR-009]]: introduced the three-branch resolver and the npx pin; this is an unenumerated install mode of that design.
- [[BUG-070]]: the same design gap one branch over (the resolver skips `node_modules/.bin`).
- [[BUG-085]]: the scaffold drift banner; that one reports scaffold drift, while this bug reports CLI/scaffold version drift.

## Context Source

**context_source:** Codex dogfood run r1 (2026-09-27); code grounding at cli main `f0c33f7`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
