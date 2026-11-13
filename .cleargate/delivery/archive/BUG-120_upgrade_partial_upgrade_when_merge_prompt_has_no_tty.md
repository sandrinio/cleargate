<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-120_upgrade-partial-upgrade-when-merge-prompt-has-no-tty.md

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
bug_id: BUG-120
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: upgrade,cli
status: Completed
severity: P1-High
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test of a real target repo (installed 0.28.0) by its own agent session, 2026-11-13, reproduced against a pristine copy of that repo with the published 0.30.0 global binary; code grounding at cli main b9fe36a: src/lib/merge-ui.ts:58-108 (promptMergeChoice listens for 'data' and 'error' only), src/commands/upgrade.ts:609-631 (every merge-3way entry is prompted regardless of drift state), README 'Upgrading' (no --yes, no non-interactive note)"
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
  last_gate_check: 2026-11-12T21:56:54Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "160641d6b2e21a9a8af942a3077a12e1161ebd907b890f082f191499c6a66bdc"
---

# BUG-120: `cleargate upgrade` without a terminal stops halfway, exits 0, and leaves the hooks on the new pin and the manifest on the old version

### Open Questions

- **Question:** What should `upgrade` do when it has merge prompts to ask and stdin is not a terminal (an agent, CI, a pipe)?
- **Recommended:** Decide before writing anything. If any merge-3way file would prompt and `process.stdin.isTTY` is false and `--yes` was not passed, print the files that need a choice and exit 2: `upgrade needs a terminal to ask about N file(s); re-run with --yes to take upstream for them, or run it in a terminal`. Nothing is written. Separately, `promptMergeChoice` settles on stdin `end`/`close` (reject), and the handler turns that into a non-zero exit that names the files already written, never a silent exit 0.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should `upgrade` prompt for merge-3way files the user never changed?
- **Recommended:** No. When the file on disk equals the install snapshot (ours == base), take upstream silently and print `[take] <path> (unchanged locally)`. When it already equals upstream, print nothing and write nothing. Prompt only for `user-modified` and `both-changed`.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should the README document non-interactive upgrades?
- **Recommended:** Yes. The "Upgrading" section names `--yes` as the agent/CI form and says what it does to files you changed (takes upstream; hooks you added to `.claude/settings.json` are kept, see [[BUG-093]]).
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `upgrade` either finishes (all files written, the install snapshot restamped to the new version, `[upgrade] complete.`, exit 0) or refuses before writing anything with a non-zero exit. Files the user never touched are updated without asking.

**Actual Behavior:**
- `promptMergeChoice` (`src/lib/merge-ui.ts:58-108`) resolves only on a newline in a `data` chunk and rejects only on `error`. At stdin EOF neither fires, the promise never settles, the event loop drains and Node exits **0**.
- By then every `always` and `pin-aware` file sorted before the first merge-3way path has been written, and `updateSnapshotEntry` has recorded their new shas. `restampSnapshotVersion` never runs, so the snapshot keeps the old `cleargate_version` and `pin_version`.
- The hooks now carry `# cleargate-pin: 0.30.0` while `pin_version` says 0.28.0. The next `upgrade --dry-run` therefore reports `session-start.sh` and `stamp-and-gate.sh` as `user-modified`.
- Every merge-3way entry is prompted whatever its drift state (`upgrade.ts:609-631`). The 0.30.0 manifest has 16 merge-3way files. In the field run all 16 were untouched locally, so all 16 prompts asked about files the user never edited.
- ClearGate's main user is an AI agent, which has no terminal. The field agent avoided the hang only by reading `merge-ui.ts` first and passing `--yes`, which the README never mentions.

## 2. Reproduction Protocol
1. Take a repo installed at 0.28.0 (any `cleargate init --pin 0.28.0` clean room works) and the 0.30.0 binary.
2. `cleargate upgrade </dev/null; echo "exit=$?"`.
3. `jq -c '{cleargate_version,pin_version}' .cleargate/.install-manifest.json` and `grep cleargate-pin .claude/hooks/session-start.sh`.
4. `cleargate upgrade --dry-run | grep -e session-start -e stamp-and-gate`.

Edge conditions:
- `--dry-run` without a terminal must keep working (it never prompts).
- `--yes` without a terminal must keep working.
- A terminal session with a user-modified merge-3way file must still be asked.
- Piped input that answers some prompts and then ends must not exit 0.

## 3. Evidence & Context
Reproduced 2026-11-13 on a pristine copy of the field repo with the published 0.30.0 binary:
```
[always] overwritten: .claude/agents/architect-reader.md
…
[pin] rewritten with pin 0.30.0: .claude/hooks/session-start.sh
[pin] rewritten with pin 0.30.0: .claude/hooks/stamp-and-gate.sh
[always] overwritten: .claude/hooks/token-ledger.sh

[merge] .claude/settings.json  state=upstream-changed
…diff…
[k]eep mine / [t]ake theirs / [e]dit in $EDITOR:
exit=0                                  # no "[upgrade] complete." line
{"cleargate_version":"0.28.0","pin_version":"0.28.0"}
# cleargate-pin: 0.30.0                 # session-start.sh
[dry-run] .claude/hooks/session-start.sh  action=pin-aware  state=user-modified → clean
[dry-run] .claude/hooks/stamp-and-gate.sh  action=pin-aware  state=user-modified → clean
```
Field report: "With stdin at EOF (agent, CI, pipe), the promise never settles and Node exits when the loop drains… a partial upgrade", and "16 prompts here, all for untouched files".

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/merge-ui.ts` `promptMergeChoice` (settle on `end`/`close`).
- `cleargate-cli/src/commands/upgrade.ts`: the action selection (~:609), a pre-write no-terminal check before §5, `applyMerge3Way` (skip the prompt when ours == base or ours == theirs).
- `cleargate-cli/README.md` "Upgrading".
- Tests beside `test/commands/upgrade.node.test.ts`.

**Do NOT modify:** the settings.json surgery ([[BUG-093]]), the gate-checks restore ([[BUG-121]]), the untracked surgery targets ([[BUG-095]]).

## Task Breakdown
- [ ] QA-Red: the five scenarios below, driving `upgradeHandler` with a non-TTY stream that ends.
- [ ] Settle `promptMergeChoice` on stream end; make the handler exit non-zero and name the files written.
- [ ] Add the pre-write no-terminal refusal.
- [ ] Skip prompts for files unchanged locally or already equal to upstream.
- [ ] README "Upgrading": `--yes` for agents/CI.
- [ ] Typecheck and the upgrade test files.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/upgrade-no-tty.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | No terminal with and without `--yes`; untouched, up-to-date and user-modified files |
| Interfaces | F | One command |
| Data | T | Drift state decides prompt or not (Scenario Outline) |
| Rules | T | Upgrade is all-or-nothing: never exit 0 with the snapshot on the old version |

```gherkin
Feature: Upgrade never stops halfway without saying so

  @paths @rules
  Scenario: No terminal and a file needs a choice
    Given an install whose .cleargate/templates/story.md was edited by the user
    And stdin is not a terminal and --yes is not passed
    When cleargate upgrade runs
    Then it exits 2 naming .cleargate/templates/story.md and --yes
    And no file and no snapshot entry has changed

  @rules
  Scenario: Input ends while a prompt is waiting
    Given a user-modified merge-3way file and piped input with no newline
    When cleargate upgrade runs
    Then it exits non-zero, lists the files already written, and does not print "[upgrade] complete."

  @data
  Scenario Outline: Untouched files are not asked about
    Given a merge-3way file whose drift state is <state>
    When cleargate upgrade runs without --yes
    Then it <outcome>

    Examples:
      | state            | outcome                                   |
      | upstream-changed | takes upstream and prints no prompt       |
      | clean            | writes nothing and prints no prompt       |
      | user-modified    | prompts with keep / take / edit           |

  @paths
  Scenario: --yes without a terminal completes
    Given stdin is not a terminal
    When cleargate upgrade --yes runs
    Then it prints "[upgrade] complete.", exits 0, and the snapshot carries the new version and pin
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | one per scenario row |
| Integration tests | 1 | spawn the built CLI with stdin from /dev/null against a temp install, no packageRoot seam |
| E2E / acceptance tests | 0 | the next field upgrade |

---

## Prior work

- [[BUG-028]]: fixed the merge prompt's dry-run/real-run state mismatch and empty diff; not stdin handling.
- [[CR-088]]: removed prompts for the pin-aware hooks; the merge-3way prompts remain.
- [[CR-115]]: a grouped pre-write warning for user-modified files; does not change prompting.

## Context Source

**context_source:** field upgrade test 2026-11-13, reproduced on a pristine copy of the field repo with the published 0.30.0 binary; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
