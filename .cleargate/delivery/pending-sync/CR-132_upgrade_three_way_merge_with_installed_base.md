---
cr_id: CR-132
parent_ref: STORY-009-05
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli-upgrade
status: Draft
approved: false
context_source: "Field upgrade watch 2026-11-13 (Python target repo, 0.27.0 → 0.30.1): --yes replaced 20 customised files (16 always/pin-aware with local edits, 4 merge-3way both-changed); the session restored them by hand with npm pack cleargate@0.27.0 as the base and git merge-file, re-rendering __CLEARGATE_VERSION__ in the pin-aware base first; afterwards the dry run again lists the 19 restored files as user-modified, so the next upgrade replaces them again. Code grounding at cli main dbccc79: src/lib/merge-ui.ts:14 (MergeChoice = 'k' | 't' | 'e'), src/commands/upgrade.ts:373-530 (applyMerge3Way: keep, take, or edit a whole-file ours/theirs conflict with no base), :300-320 (applyAlwaysOverwrite), :343 (applyPinAware), src/lib/manifest.ts:63,85 (the install record keeps cleargate_version, pin_version and per-file sha256, no content). CR-115 Q1 deferred a local-overrides mechanism to a separate item."
created_at: 2026-11-13T09:14:29.353Z
updated_at: 2026-11-13T09:14:29.353Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:25:16Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-132
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:25:16Z
  sessions: []
last_contradict_sha: "c6a415c999f87a5be48a93b3a821efceef522c62ab7d52ed094dab148e334c2e"
---

# CR-132: Upgrade merges local edits against the installed version instead of replacing them

## 0.5 Open Questions

- **Question:** Where does upgrade get the base (the files as the installed version shipped them)?
- **Recommended:** From the npm registry: the install record names `cleargate_version`, so upgrade fetches that version's tarball (`npm pack cleargate@<installed>` into a temp dir), reads the payload file, and renders `__CLEARGATE_VERSION__` with the recorded `pin_version`. It checks each base file's hash against the install record before using it. No new files in the repo. When the fetch fails (offline, unpublished version) or a hash does not match, that file falls back to today's behaviour with a one-line warning.
- **Human decision:** pending

- **Question:** Do `always` and `pin-aware` files with local edits get merged too, or only `merge-3way` files?
- **Recommended:** Both. The field repo's edits were mostly in `always` files (scripts, skills, an agent). A clean merge keeps the edits and takes upstream's changes. A conflict takes upstream (the `always` contract) and saves the user's version beside it as `<path>.local`, named in the output. Files without local edits are unchanged: taken as today.
- **Human decision:** pending

- **Question:** What does `--yes` (no terminal) do with a merge conflict?
- **Recommended:** The same as an `always` conflict: take upstream, save `<path>.local`, list it, and exit 0. A clean merge needs no prompt, so with this CR `--yes` only decides conflicts.
- **Human decision:** pending

- **Question:** Which merge engine?
- **Recommended:** `git merge-file -p <ours> <base> <theirs>`. Every ClearGate repo is a git repo (worktrees, hooks), and it is the tool the field session used to recover. No new npm dependency.
- **Human decision:** pending

## 1. The Context Override (Old vs. New)
**Obsolete Logic (What to Remove / Forget):**
- "merge-3way" means keep, take, or edit: `MergeChoice = 'k' | 't' | 'e'` (`merge-ui.ts:14`), and `[e]dit` writes a whole-file `<<<<<<< ours … ======= … >>>>>>> theirs` conflict with no base (`upgrade.ts:482-488`). `--yes` takes upstream. No merge happens.
- An `always` or `pin-aware` file with local edits is replaced (`applyAlwaysOverwrite`, `applyPinAware`).
- After a user re-applies their edits by hand, the next upgrade replaces them again (the dry run labels them `user-modified` every time).

**New Logic (The New Truth):**
- For every file that differs from the install record (`user-modified` or `both-changed`), upgrade fetches the installed version's file as the base and runs a three-way merge of local (ours), base, and the new package (theirs).
- A clean merge is written without a prompt and reported as `[merged] <path>  (local edits kept)`.
- A conflict in a `merge-3way` file is asked about in a terminal (keep / take / edit, where edit now opens real conflict hunks); without a terminal or with `--yes`, and for every `always`/`pin-aware` conflict, upstream is taken and the local file is saved as `<path>.local`, reported as `[conflict] <path>  (upstream taken; your version in <path>.local)`.
- The install record is updated as today, so the next upgrade uses the then-installed version as the base and the same edits merge again. A customisation survives every upgrade that does not touch the same lines.
- When no base can be had for a file, today's behaviour applies to that file, with a warning naming it.

## 2. Blast Radius & Invalidation
- [ ] Invalidate/Update Story: [[STORY-009-05]] (upgrade command, Completed): its merge semantics change; no reopen, this CR supersedes them.
- [ ] Invalidate/Update Story: [[STORY-010-03]] (keep/take/edit helper, Completed): the `[e]dit` buffer gains a base.
- [ ] Update CR: [[CR-115]] (Approved, unscheduled): its grouped warning should name what will be merged, what will conflict, and what will be replaced, so it should land with or after this CR; its Q1 "local-overrides" follow-on is answered by this CR rather than a new directory.
- [ ] Database schema impacts? No. The install record format is unchanged; no new files in target repos except `<path>.local` on a conflict.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/upgrade.ts:373` — `applyMerge3Way`: keep / take / edit prompt for `merge-3way` files.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:300` — `applyAlwaysOverwrite`: replaces `always` files.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:343` — `applyPinAware`: replaces and re-pins `pin-aware` files.
- **Surface:** `cleargate-cli/src/lib/merge-ui.ts:14` — the `MergeChoice` prompt.
- **Surface:** `cleargate-cli/src/lib/manifest.ts:63` — the install record (`cleargate_version`, `pin_version`, per-file `sha256`) that identifies the base version and verifies the fetched base.
- **Why this CR extends rather than rebuilds:** the classification (clean / upstream-changed / user-modified / both-changed), the prompt, the no-TTY rules (BUG-120) and the install-record updates (BUG-122) stay. This CR adds a base fetch and a merge step in front of the existing write paths, and changes what happens to files with local edits.

## Prior work

- [[CR-115]] (Approved, unscheduled): grouped warning before user-modified files are overwritten; changes no writes; deferred a local-overrides mechanism to a separate item.
- [[STORY-009-05]] and [[STORY-010-03]] (Completed): the upgrade command and the keep/take/edit helper this CR changes.
- [[BUG-120]] (Completed, 0.30.1): no-TTY upgrade; files unchanged locally are taken without a prompt; the install record is the base reference by hash only.
- [[CR-088]] (Completed): the `pin-aware` policy; [[BUG-037]] and [[CR-096]]: `always` for gate-checks.json and `merge-3way` for the README.
- [[EPIC-059]]: notes that `qa.md` and the sprint-execution skill install `always`.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/upgrade.ts` (`applyMerge3Way`, `applyAlwaysOverwrite`, `applyPinAware`, dry-run labels, the no-TTY list)
- `cleargate-cli/src/lib/merge-ui.ts` (the edit buffer carries real conflict hunks)
- `cleargate-cli/src/lib/upgrade-base.ts` (new: fetch, verify and pin-render the installed version's files)
- `cleargate-cli/CHANGELOG.md` (Upgrade notes)

**Do NOT modify:** `.claude/settings.json` handling (BUG-093/BUG-134 own it); `gate-checks.json` command keeping (BUG-121); the `.mcp.json` pin and CLAUDE.md block (BUG-095); `init`.

## Task Breakdown
- [ ] QA-Red: the scenarios below, against fixture installs at an older version with a local registry tarball.
- [ ] Base fetch: tarball for the recorded version, hash check against the install record, pin render, per-file fallback.
- [ ] Merge step: `git merge-file` for user-modified and both-changed files; clean → write; conflict → policy rule and `<path>.local`.
- [ ] Output and dry run: `[merged]`, `[conflict]` and fallback lines; the dry run predicts merge or conflict per file.
- [ ] CHANGELOG Upgrade notes; typecheck; upgrade tests.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run test:file -- test/commands/upgrade-three-way.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | clean merge, conflict, no base available |
| Interfaces | T | terminal prompt, `--yes`, `--dry-run` |
| Data | T | `always`, `pin-aware`, `merge-3way` files |
| Rules | T | local edits survive a second upgrade; a conflict never loses the user's version |

```gherkin
Feature: Upgrade keeps local edits by merging against the installed version

  @paths @data
  Scenario Outline: Non-overlapping local edits are kept
    Given a repo installed at version A with a local edit to <file> of policy <policy>
    And version B changes different lines of <file>
    When cleargate upgrade --yes runs to version B
    Then <file> has both the local edit and version B's change
    And the output has "[merged] <file>  (local edits kept)"

    Examples:
      | file                                        | policy     |
      | .cleargate/scripts/close_sprint.mjs         | always     |
      | .claude/hooks/session-start.sh              | pin-aware  |
      | .cleargate/templates/Bug.md                 | merge-3way |

  @paths @rules
  Scenario: A conflict keeps the user's version beside upstream's
    Given a local edit and a version B change to the same line of an always file
    When cleargate upgrade --yes runs
    Then the file equals version B's
    And <path>.local holds the local version
    And the output names both

  @rules
  Scenario: Customisations survive a second upgrade
    Given a repo upgraded from A to B with a merged local edit
    When cleargate upgrade runs from B to C, which does not touch those lines
    Then the local edit is still present after the upgrade

  @paths
  Scenario: No base available falls back with a warning
    Given the registry cannot serve version A
    When cleargate upgrade --yes runs
    Then each user-modified file is handled as in 0.30.1
    And a warning names the files that could not be merged

  @interfaces
  Scenario: The dry run predicts merges and conflicts
    Given one cleanly mergeable and one conflicting local edit
    When cleargate upgrade --dry-run runs
    Then the first is labelled "→ merge" and the second "→ conflict"
    And nothing is written

  @interfaces
  Scenario: A terminal edit shows real conflict hunks
    Given a conflicting merge-3way file and a terminal
    When the user picks edit
    Then the edit buffer holds conflict markers around the conflicting lines only
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | one per scenario and example row |
| Integration tests | 2 | an A→B→C upgrade chain on a fixture repo with a local tarball registry; an offline fallback run |
| E2E / acceptance tests | 1 | the next field upgrade of a repo with customised scripts |

## Context Source

**context_source:** field upgrade watch 2026-11-13 (Python target repo, 0.27.0 → 0.30.1), manual recovery recipe observed; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
