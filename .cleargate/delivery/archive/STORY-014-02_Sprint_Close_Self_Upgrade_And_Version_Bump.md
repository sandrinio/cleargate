---
story_id: STORY-014-02
parent_epic_ref: SPRINT-14
parent_cleargate_id: SPRINT-14
sprint_cleargate_id: SPRINT-14
status: Completed
ambiguity: 🟢 Low
context_source: SPRINT-14_Process_v2.md §M5 + R-10/R-11/R-12
actor: ClearGate orchestrator (manual close-out)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M5
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
  last_gate_check: 2026-04-27T00:00:01Z
implementation_files:
  []
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-014-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T23:01:22Z
  sessions: []
---

# STORY-014-02: Sprint Close Self-Upgrade — `cleargate upgrade` + Version Bump 0.5.0→0.6.0
**Complexity:** L2 — `cleargate upgrade` invocation on this repo + 3 version bumps in a single chore commit. Manifest-driven copy must NOT clobber `.cleargate/delivery/`, `.cleargate/wiki/`, `.cleargate/sprint-runs/`, `.cleargate/hook-log/`, `.cleargate/FLASHCARD.md` (R-10).

## 1. The Spec (The Contract)

### 1.1 User Story

As the ClearGate orchestrator at sprint close, I want to consume my own work — refresh the live `.claude/` and scaffold-managed `.cleargate/{knowledge,templates}/` from the post-SPRINT-14 canonical, bump versions in three places (cleargate-cli, cleargate-planning/MANIFEST.json, mcp), and commit atomically — so that this repo runs SPRINT-15+ on the new `cleargate@0.6.0` framework rather than committing the new framework while still running the old one.

### 1.2 Detailed Requirements

Single chore commit covering:

1. **Run `cleargate upgrade` on this repo** to copy the new scaffold canonical from `cleargate-planning/.claude/*` into the live (gitignored) `.claude/`, AND from `cleargate-planning/.cleargate/{knowledge,templates,scripts}/*` into the corresponding root paths. Manifest-driven (only files listed in `cleargate-planning/MANIFEST.json` are touched — verified by R-10 mitigation).
2. **Pre-upgrade safety net (R-10):** Capture `git status --porcelain` snapshot BEFORE running upgrade. Take a tarball backup of `.cleargate/delivery/` + `.cleargate/wiki/` to a temp location (e.g. `/tmp/cleargate-pre-upgrade-<timestamp>.tar`). Post-upgrade: diff status again. Any unexpected modifications outside the manifest file list = QA kicks back. The `delivery/`, `wiki/`, `sprint-runs/`, `hook-log/`, `FLASHCARD.md` files MUST be byte-unmodified post-upgrade.
3. **Version bumps (atomic):**
   - `cleargate-cli/package.json` 0.5.0 → 0.6.0.
   - `cleargate-planning/MANIFEST.json` cleargate_version 0.5.0 → 0.6.0.
   - `mcp/package.json` 0.1.0 → 0.2.0 (CR-010 landed substantive `push-item.ts` changes — minor bump justified).
4. **Pin re-stamp (R-12):** After `cleargate upgrade`, grep both `cleargate-planning/.claude/hooks/stamp-and-gate.sh` and `cleargate-planning/.claude/hooks/session-start.sh` for the pinned `__CLEARGATE_VERSION__` placeholder OR the previous-version literal. Re-stamp to `0.6.0` via the one-line sed pattern CR-009 specced (`# cleargate-pin: <version>` + `npx -y @cleargate/cli@<version>`). One sed pattern catches both occurrences in both hooks. Live + scaffold byte-equality preserved.
5. **Pre-commit pre-flight validation:**
   - All three version values match the expected target (0.6.0 / 0.6.0 / 0.2.0). If any one is wrong, abort.
   - Live + scaffold mirrors byte-equal for: `.claude/agents/*.md`, `.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/templates/*.md`, `.cleargate/scripts/*.{mjs,sh}` (where mirrored).
   - `cleargate --version` reports `0.6.0` (verify via `node cleargate-cli/dist/cli.js --version` or rebuild dist if needed).
6. **Single commit** with message:
   ```
   chore(SPRINT-14): self-upgrade — bump cleargate 0.5.0 → 0.6.0 + mcp 0.1.0 → 0.2.0
   
   Sprint close-out per STORY-014-02. Refreshes live `.claude/` + scaffold-managed
   `.cleargate/{knowledge,templates,scripts}/` from post-SPRINT-14 canonical via
   `cleargate upgrade`. Pin re-stamp from 0.5.0 → 0.6.0 in both hook scripts.
   Three-way version bump: cleargate-cli 0.5.0→0.6.0, MANIFEST.json 0.5.0→0.6.0,
   mcp 0.1.0→0.2.0.
   
   R-10 verification: pre/post `git status` diff confined to manifest-listed files.
   `.cleargate/delivery/`, `.cleargate/wiki/`, `.cleargate/sprint-runs/`,
   `.cleargate/hook-log/`, `.cleargate/FLASHCARD.md` byte-unmodified.
   R-11 verification: all three versions match expected targets pre-commit.
   R-12 verification: pin re-stamp via one-line sed; live + scaffold byte-equal.
   
   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   ```

### 1.3 Out of Scope

- Reporter contract change (STORY-022-07 owns).
- Dogfood end-to-end (STORY-022-08 owns; runs against the post-014-02 live dogfood).
- Sprint REPORT.md generation (STORY-022-08 close + Reporter agent at sprint close).
- Publishing `cleargate-cli@0.6.0` to npm registry (manual user step, post-commit).
- Deploying mcp@0.2.0 to Coolify (manual user step, post-commit).
- Backporting v2.1 sections to historical REPORT.md (per STORY-022-07).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Sprint close self-upgrade

  Scenario: cleargate upgrade refreshes live scaffold from canonical
    Given the post-SPRINT-14 main branch HEAD includes M1-M5 commits
    And `cleargate-planning/.claude/agents/architect.md` has §"Lane Classification"
    When `cleargate upgrade` runs on this repo
    Then `.claude/agents/architect.md` is byte-identical to `cleargate-planning/.claude/agents/architect.md`
    And `.cleargate/knowledge/cleargate-protocol.md` is byte-identical to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`
    And `.cleargate/templates/hotfix.md` is byte-identical to `cleargate-planning/.cleargate/templates/hotfix.md`
    And `.cleargate/delivery/` is byte-unmodified
    And `.cleargate/wiki/` is byte-unmodified
    And `.cleargate/sprint-runs/` is byte-unmodified
    And `.cleargate/FLASHCARD.md` is byte-unmodified
    And `.cleargate/hook-log/` is byte-unmodified

  Scenario: Three-way version bump lands atomically
    Given the pre-014-02 versions are cleargate-cli@0.5.0 / MANIFEST@0.5.0 / mcp@0.1.0
    When the close-out commit runs
    Then `cleargate-cli/package.json` reports `"version": "0.6.0"`
    And `cleargate-planning/MANIFEST.json` reports `"cleargate_version": "0.6.0"`
    And `mcp/package.json` reports `"version": "0.2.0"`
    And all three changes are in the same commit (no partial bump)

  Scenario: Pin re-stamp updates both hooks
    Given pre-014-02, both hooks reference `npx -y @cleargate/cli@0.5.0`
    When the close-out commit runs
    Then `cleargate-planning/.claude/hooks/stamp-and-gate.sh` references `npx -y @cleargate/cli@0.6.0`
    And `cleargate-planning/.claude/hooks/session-start.sh` references `npx -y @cleargate/cli@0.6.0`
    And the comment marker `# cleargate-pin: 0.6.0` appears in both files
    And live + scaffold mirrors byte-equal for both

  Scenario: cleargate --version reports 0.6.0 post-commit
    Given the close-out commit has landed
    When `node cleargate-cli/dist/cli.js --version` runs (or equivalent)
    Then the output is `0.6.0`

  Scenario: R-10 safety net catches accidental clobber
    Given `cleargate upgrade` is invoked
    When the upgrade completes
    Then the `git status --porcelain` diff between pre and post lists ONLY files declared in `MANIFEST.json` `files[]`
    And no file under `.cleargate/{delivery,wiki,sprint-runs,hook-log}` is modified
    And `.cleargate/FLASHCARD.md` is unmodified
```

### 2.2 Manual Verification

- `git status` pre-014-02: capture as baseline.
- Run `cleargate upgrade` (or whatever the verb is — verify via `cleargate --help` first).
- `git status` post-014-02: diff against baseline; confirm only manifest-listed files changed.
- Compare `.cleargate/delivery/`, `.cleargate/wiki/`, `.cleargate/sprint-runs/`, `.cleargate/hook-log/`, `.cleargate/FLASHCARD.md` byte-by-byte to backups; confirm unchanged.
- Run `cleargate --version`; confirm `0.6.0`.
- Run `cleargate doctor`; confirm exit 0 with the new resolver-status line + planning-first reminder (CR-008 + CR-009 + STORY-014-01 surfaces all reporting in).

## 3. Implementation Guide

### 3.1 Files To Modify

- `cleargate-cli/package.json` (version field).
- `cleargate-planning/MANIFEST.json` (cleargate_version field; sha256 entries auto-recomputed by `build-manifest.ts`).
- `mcp/package.json` (version field).
- `cleargate-planning/.claude/hooks/stamp-and-gate.sh` + scaffold mirror live at `.claude/hooks/stamp-and-gate.sh`.
- `cleargate-planning/.claude/hooks/session-start.sh` + scaffold mirror live at `.claude/hooks/session-start.sh`.
- (auto, via `cleargate upgrade`) live `.claude/agents/*`, `.cleargate/knowledge/*.md`, `.cleargate/templates/*.md`, `.cleargate/scripts/*.{mjs,sh}` get refreshed from canonical.

### 3.2 Technical Logic

Sequence:

```
1. Capture pre-state:
   git status --porcelain > /tmp/cleargate-pre-014-02.txt
   tar czf /tmp/cleargate-delivery-wiki-pre.tar.gz .cleargate/delivery .cleargate/wiki .cleargate/sprint-runs .cleargate/FLASHCARD.md

2. Bump versions:
   sed -i.bak 's/"version": "0.5.0"/"version": "0.6.0"/' cleargate-cli/package.json
   sed -i.bak 's/"cleargate_version": "0.5.0"/"cleargate_version": "0.6.0"/' cleargate-planning/MANIFEST.json
   sed -i.bak 's/"version": "0.1.0"/"version": "0.2.0"/' mcp/package.json
   rm cleargate-cli/package.json.bak cleargate-planning/MANIFEST.json.bak mcp/package.json.bak

3. Pin re-stamp:
   sed -i.bak 's|@cleargate/cli@0.5.0|@cleargate/cli@0.6.0|g; s|cleargate-pin: 0.5.0|cleargate-pin: 0.6.0|g' \
     cleargate-planning/.claude/hooks/stamp-and-gate.sh \
     cleargate-planning/.claude/hooks/session-start.sh
   rm cleargate-planning/.claude/hooks/*.bak

4. Run upgrade (refreshes live):
   node cleargate-cli/dist/cli.js upgrade
   # Or whatever the actual command is — verify pre-flight via `cleargate --help`

5. Verify:
   diff /tmp/cleargate-pre-014-02.txt <(git status --porcelain) | filter to manifest-listed files
   diff <(tar tf /tmp/cleargate-delivery-wiki-pre.tar.gz) <(actual delivery/wiki state) — must be empty
   node cleargate-cli/dist/cli.js --version  # → 0.6.0
   node cleargate-cli/dist/cli.js doctor     # → exit 0

6. Commit (single):
   git add -p (carefully, only manifest-listed files + the three version bumps + the two hook re-stamps)
   git commit -m "<chore message>"
```

**Cross-OS portability** (per BUG-010 §4b):
- Use `sed -i.bak` not `sed -i` (BSD sed needs the suffix; we delete the .bak after).
- `tar czf` portable across BSD + GNU.
- `node` invocations not bash-only logic.

### 3.3 API / CLI Contract

`cleargate upgrade` is the existing verb (verify via `cleargate --help`); if no such verb exists, this story creates it OR uses `cleargate init --upgrade` whichever the existing CLI exposes. Architect will surface this in M5 plan.

## 4. Quality Gates

### 4.1 Test Expectations

- 5 Gherkin scenarios passing.
- A test asserting all three version values match expected targets simultaneously (catches partial bumps).
- A test asserting the hook pin re-stamp regex catches both files in one pass.
- No regression in existing `cleargate upgrade` tests (if any).

### 4.2 Definition of Done

- [ ] `cleargate upgrade` invoked successfully.
- [ ] All three version values bumped: 0.5.0 / 0.5.0 / 0.1.0 → 0.6.0 / 0.6.0 / 0.2.0.
- [ ] Hook pin re-stamped to 0.6.0 in both files.
- [ ] Live + scaffold mirrors byte-equal post-upgrade.
- [ ] `.cleargate/{delivery,wiki,sprint-runs,hook-log,FLASHCARD.md}` byte-unmodified.
- [ ] `cleargate --version` reports `0.6.0`.
- [ ] `npm run typecheck` clean for both `cleargate-cli` and `mcp`.
- [ ] `npm test` green for both `cleargate-cli` and `mcp`.
- [ ] Commit message format matches §1.2.
- [ ] One commit. NEVER `--no-verify`.
