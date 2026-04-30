---
story_id: STORY-022-06
parent_epic_ref: EPIC-022
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: ClearGate CLI user / Developer agent
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M4
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T20:50:50Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T20:50:50Z
  sessions: []
---

# STORY-022-06: Hotfix Lane — `hotfix.md` Template + Scaffold Mirror + `cleargate hotfix new` + Hotfix Ledger
**Complexity:** L3 — three new entities (template, scaffold mirror, ledger page) + new CLI subcommand + cap-detection stub. Cross-OS portable.

## 1. The Spec (The Contract)

### 1.1 User Story

As a ClearGate user (or Developer agent), I want a one-shot `cleargate hotfix new <slug>` command that scaffolds a fresh `pending-sync/HOTFIX-NNN_<slug>.md` from a dedicated template, so that off-sprint trivial work has a first-class surface that's audit-trailed in `wiki/topics/hotfix-ledger.md` instead of polluting the sprint plan or being done invisibly.

### 1.2 Detailed Requirements

Three new entities + one CLI subcommand + one stub:

1. **`.cleargate/templates/hotfix.md`** + scaffold mirror at `cleargate-planning/.cleargate/templates/hotfix.md`:
   - Frontmatter: `hotfix_id`, `status` (Draft|In Fix|Verified|Completed), `severity` (P0|P1|P2|P3), `originating_signal` (user-report | monitor | drive-by | regression), `created_at`, `created_at_version`, `merged_at` (set at merge time), `commit_sha` (set at merge time), `verified_by` (user identity), `lane: "hotfix"`, plus the standard sync attribution fields per EPIC-010 (pushed_by/pushed_at/last_pulled_by/last_pulled_at/last_remote_update/source/last_synced_status/last_synced_body_sha).
   - §1 Anomaly: brief expected-vs-actual.
   - §2 Files Touched: list per spec (hotfix is bounded ≤2 files / ≤30 LOC net per EPIC-022 §3 hotfix discipline).
   - §3 Verification Steps: **mandatory** numbered list the user walks before merging. The §3 must include a checkbox the user marks at merge time. Empty §3 = block at draft time.
   - §4 Rollback: one-paragraph rollback path. Required.
   - Both files (live + scaffold mirror) MUST stay byte-identical post-commit.

2. **`.cleargate/wiki/topics/hotfix-ledger.md`** (new append-only synthesis page):
   - Frontmatter: `type: "synthesis"`, `id: "hotfix-ledger"`, `generated_at: <ISO>` (touched on each append).
   - One YAML block per merged hotfix: `merged_at`, `id`, `files[]`, `loc_changed`, `originating_signal`, `commit_sha`, `verified_by`. Sprint-window fields (`sprint_id`, `could_have_been_sprint_story`, `planning_miss_reason`) are filled by the Reporter at sprint close (not by this story).
   - Linked from `wiki/index.md` under a new "Hotfix Ledger" section header.

3. **`cleargate-cli/src/commands/hotfix.ts`** (new) registering `cleargate hotfix new <slug>`:
   - Reads the template, substitutes minimal placeholders (`{ID}` to next available HOTFIX-NNN, `{SLUG}` to the user's slug, `{ISO}` to now).
   - Writes to `.cleargate/delivery/pending-sync/HOTFIX-<NNN>_<slug>.md`.
   - Bumps the next-id counter via the existing pattern (likely a scan of `pending-sync/HOTFIX-*.md` for the highest NNN; defensive — if the pattern is centralised in `cleargate-cli/src/lib/`, use that helper).
   - Wires into `cli.ts` via the existing commander pattern.

4. **Hotfix cap stub at draft time** (per EPIC-022 §2 IN-SCOPE):
   - At `cleargate hotfix new <slug>` invocation, count `pending-sync/HOTFIX-*.md` plus archived hotfixes resolved in the last 7 days. If ≥3, print a warning and exit non-zero with a clear message: *"Hotfix cap: ≤3 per rolling 7-day window. Currently <N> active. Bundle into a sprint or downgrade one to a CR."*
   - The full rolling-window walk is the v1 implementation (deferred optimisation per EPIC-022 §2 OUT-OF-SCOPE).

5. **Hotfix ledger writer** — at hotfix merge (NOT in this story; the merge step is manual or future-CR), but ship a small helper at `cleargate-cli/src/lib/hotfix-ledger.ts` that takes a hotfix's frontmatter + commit_sha and appends a YAML block to `wiki/topics/hotfix-ledger.md`. Wire it via a new optional CLI: `cleargate hotfix close <ID> --commit-sha <SHA>` (deferred optional — if scope is too tight, skip and document as a SPRINT-15 follow-up).

### 1.3 Out of Scope

- Reporter §5 Hotfix Audit table population (STORY-022-07 owns).
- Reporter §3 Hotfix Count metrics (STORY-022-07 owns).
- The full rolling-7-day window optimisation (deferred per EPIC-022 §2 OUT-OF-SCOPE — only stub the count).
- Architect rubric / agent.md (STORY-022-01 shipped).
- state.json schema (STORY-022-02 shipped — hotfixes don't appear in state.json since they're off-sprint).
- pre_gate_runner.sh (STORY-022-04 owns; pre-gate scanner runs on hotfixes the same way as on sprint stories).
- Developer agent (STORY-022-05 owns — Developer's lane=fast logic does not extend to lane=hotfix; hotfixes are off-sprint and follow a separate orchestrator path that this story scaffolds the artifact for, not the dispatch).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Hotfix lane scaffolding

  Scenario: cleargate hotfix new scaffolds a valid pending-sync file
    Given a clean repo with no pending-sync HOTFIX-* files
    When the user runs `cleargate hotfix new copy-fix`
    Then the file `.cleargate/delivery/pending-sync/HOTFIX-001_copy_fix.md` exists
    And the file matches the template structure (frontmatter, §1, §2, §3, §4 sections)
    And §3 Verification Steps is present and non-empty (skeleton placeholder)
    And §4 Rollback is present and non-empty (skeleton placeholder)
    And the frontmatter has `hotfix_id: HOTFIX-001`, `lane: "hotfix"`, `status: "Draft"`

  Scenario: cleargate hotfix new increments the ID across multiple invocations
    Given pending-sync already has HOTFIX-001_old_fix.md
    When the user runs `cleargate hotfix new another-fix`
    Then the new file is HOTFIX-002_another_fix.md
    And HOTFIX-001 is unchanged

  Scenario: Hotfix cap blocks the 4th draft in a rolling 7-day window
    Given 3 hotfix files exist in pending-sync (or merged in archive within last 7 days)
    When the user runs `cleargate hotfix new fourth-fix`
    Then the command exits with non-zero
    And stderr includes "Hotfix cap: ≤3 per rolling 7-day window"
    And stderr includes the count of currently-active hotfixes
    And no HOTFIX-NNN_*.md file is created

  Scenario: Template scaffold mirror byte-equality
    Given .cleargate/templates/hotfix.md and cleargate-planning/.cleargate/templates/hotfix.md
    When `diff` is run between the two
    Then the diff is empty

  Scenario: Hotfix ledger page exists and is linked from wiki/index.md
    Given the wiki has been built post-this-story
    When a reader navigates wiki/index.md
    Then a "Hotfix Ledger" section exists
    And it links to wiki/topics/hotfix-ledger.md
    And wiki/topics/hotfix-ledger.md is an empty append-only page (no rows yet)
```

### 2.2 Manual Verification

- Run `cleargate hotfix new test-slug` in a temp repo; verify file shape.
- Run twice in a row; verify ID increments.
- Stage 3 hotfix files; run `cleargate hotfix new fourth`; verify cap-block.
- `diff` template files for byte-equality.

## 3. Implementation Guide

### 3.1 Files To Modify / Create

**Create:**
- `.cleargate/templates/hotfix.md` (live).
- `cleargate-planning/.cleargate/templates/hotfix.md` (scaffold mirror — byte-identical).
- `.cleargate/wiki/topics/hotfix-ledger.md` (new append-only ledger; initial state = frontmatter + empty body).
- `cleargate-cli/src/commands/hotfix.ts` (new CLI subcommand).
- `cleargate-cli/src/lib/hotfix-ledger.ts` (small helper — optional; defer to SPRINT-15 if scope is tight).
- `cleargate-cli/test/commands/hotfix-new.test.ts` (vitest for the 5 Gherkin scenarios).

**Modify:**
- `cleargate-cli/src/cli.ts` — register the new `hotfix` subcommand group with `new` as the first verb.
- `cleargate-planning/MANIFEST.json` — declare `hotfix.md` template entry. Bump scaffold version (or defer the bump to STORY-014-02 sprint close-out).
- `.cleargate/wiki/index.md` — add "Hotfix Ledger" section linking to `wiki/topics/hotfix-ledger.md`.

### 3.2 Technical Logic

The CLI surface mirrors the existing `cleargate story new` (or `cleargate sprint new`) pattern. Verify by reading `cleargate-cli/src/commands/` for the `*-new.ts` patterns; follow conventions verbatim (id-bumping, file-shape substitution, CLI flag set).

The cap-stub:

```typescript
function countActiveHotfixes(repoRoot: string): number {
  const pendingDir = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(repoRoot, '.cleargate', 'delivery', 'archive');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  let count = 0;
  for (const entry of fs.readdirSync(pendingDir)) {
    if (entry.startsWith('HOTFIX-') && entry.endsWith('.md')) count++;
  }
  for (const entry of fs.readdirSync(archiveDir)) {
    if (entry.startsWith('HOTFIX-') && entry.endsWith('.md')) {
      const stat = fs.statSync(path.join(archiveDir, entry));
      if (stat.mtimeMs >= sevenDaysAgo) count++;
    }
  }
  return count;
}
```

### 3.3 API / CLI Contract

- `cleargate hotfix new <slug>` — required positional arg, `<slug>` must match `^[a-z0-9-]+$` (kebab-case).
- Optional flags (skip if scope tight): `--severity P0|P1|P2|P3`, `--originating-signal user-report|monitor|drive-by|regression`.
- Exit codes:
  - `0` — file created.
  - `1` — cap exceeded or invalid slug.
  - `2` — config error (missing `.cleargate/`).

### 3.4 Cross-OS Portability (per BUG-010 §4b)

- Node fs APIs only.
- File timestamp via `fs.statSync().mtimeMs` (portable).
- Path joins via `path.join` (POSIX-compatible).
- No shell-outs in the CLI logic.

## 4. Quality Gates

### 4.1 Test Expectations

- Five Gherkin scenarios passing.
- Template byte-equality (covered by `template-stubs.test.ts` post STORY-022-03 — verify it picks up the new template pair automatically; if not, extend the loop).
- Cap-stub regression: stage 3 mock hotfix files, assert cap fires.

### 4.2 Definition of Done

- [ ] `hotfix.md` template + scaffold mirror byte-identical.
- [ ] `wiki/topics/hotfix-ledger.md` page created (initial state = empty append-only).
- [ ] `wiki/index.md` has the "Hotfix Ledger" section linking to it.
- [ ] `cleargate hotfix new <slug>` registered + working.
- [ ] Cap-stub blocks 4th hotfix in rolling 7-day window.
- [ ] All five Gherkin scenarios have passing tests.
- [ ] Cross-OS portability rules followed.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-06): SPRINT-14 M4 — Hotfix lane (template + scaffold + cleargate hotfix new + ledger page)`.
- [ ] One commit. NEVER `--no-verify`.
