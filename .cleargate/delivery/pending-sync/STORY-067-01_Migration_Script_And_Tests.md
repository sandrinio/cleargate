---
story_id: STORY-067-01
parent_epic_ref: CR-067
parent_cleargate_id: CR-067
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,scripts,migration
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
context_source: |
  Phase A of CR-067 (per CR-067 §3 Migration Execution Plan). Ships the
  migration script + its tests + the `.migration-lock` flock primitive.
  Does NOT apply the migration; that's STORY-067-02 Phase B.

  Decomposed at SPRINT-28 SDR 2026-05-17. Disjoint from CR-066 files;
  parallel-eligible with STORY-066-01.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "'## Existing Surfaces' has no path citations and no \"no overlap found\" sentinel"
  last_gate_check: 2026-05-17T18:40:05Z
stamp_error: no ledger rows for work_item_id STORY-067-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T18:40:05Z
  sessions: []
---

# STORY-067-01: Migration Script + Tests + `.migration-lock` Primitive

**Complexity:** L2 — one new `.mjs` script + one new test file + one tiny `push.ts` edit to honor the lock.

## 1. The Spec

### 1.1 User Story

As CR-067's Phase B operator, I want a `migrate-status-to-completed.mjs` script that walks `.cleargate/delivery/**/*.md`, rewrites `status: Done|Verified` → `status: Completed` atomically with a `.migration-lock` flock, and supports `--dry-run` and `--apply` modes, so that Phase B can ship the ~113-item rewrite in one safe commit.

### 1.2 Detailed Requirements

1. **`cleargate-cli/scripts/migrate-status-to-completed.mjs`** (new):
   - CLI signature: `node migrate-status-to-completed.mjs [--dry-run|--apply] [--delivery-root <path>]`.
   - Default mode: `--dry-run` (prints diff, mutates nothing).
   - `--apply`: acquires `.cleargate/.migration-lock` (via `proper-lockfile` if available; else `fs.mkdirSync` exclusive flag); aborts with retry-message if lock present.
   - Walks `<delivery-root>/{pending-sync,archive}/**/*.md`. For each `.md` file, reads raw bytes; if frontmatter (first `---\n...\n---` block) contains `status: Done` or `status: Verified` (exact line match), rewrites the line to `status: Completed` and atomically writes via `tmpfile + renameSync`.
   - Also handles quoted variants: `status: "Done"` / `status: "Verified"` → `status: Completed` (drop quotes).
   - **DOES NOT** touch state.json `story_state` values (per CR-067 Q3 resolution; state.json vocab is orthogonal).
   - **DOES NOT** rewrite non-terminal stale statuses (`Approved`, `Draft`, `Triaged`, `"🟢"`) — instead, prints a `FLAGGED` list for human triage at the end.
   - Releases the lock on exit (including on Error).
   - Prints a summary: `Rewrote: N files (X Done, Y Verified). Flagged for human review: M files: [...]`.
2. **Lock-respecting push edit** in `cleargate-cli/src/commands/push.ts`:
   - Before any frontmatter write, check `.cleargate/.migration-lock`. If present, exit with: `Error: CR-067 migration in progress (.migration-lock held); retry in 30s`. Exit code 75 (`EX_TEMPFAIL`).
3. **Tests** at `cleargate-cli/scripts/migrate-status-to-completed.node.test.ts`:
   - Six fixture shapes per §4.1.
   - Use real tmpdir fixtures (no mocks). Each test creates a fake `delivery/{pending-sync,archive}/` skeleton, runs the script via `spawnSync(node, [scriptPath, '--apply', '--delivery-root', tmpDir])`, asserts post-state.
4. **Roundtrip-byte safety**: use raw-bytes regex-replace (FLASHCARD 2026-04-24 `#frontmatter #write-back`). Do NOT parse-and-re-serialize frontmatter — parseFrontmatter strips one leading blank line from body.

### 1.3 Out of Scope

- Running the migration against the live archive (STORY-067-02).
- Updating templates (STORY-067-02).
- Tightening `ARTIFACT_TERMINAL_STATUSES` to `['Completed']` (STORY-067-03).
- Updating gate-check expectations in `lifecycle-reconcile.ts` lines 47/51/309 (STORY-067-03).
- MCP adapter mapping documentation (STORY-067-03).

### 1.4 Open Questions

None. CR-067 §3 Phase A enumerates the migration mechanics; all six fixture shapes derive from CR-067 §4 Verification Protocol.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Migration script edits a file mid-write while another process reads it | Atomic rename pattern from push.ts; readers see either pre- or post-state, never partial |
| `.migration-lock` stale after a crash | Lock file includes PID; if process not running, treat as stale and reclaim (logged warning) |
| A frontmatter has `status: Done` as a quoted string we didn't anticipate (`status: 'Done'`) | Test fixture 7 covers single-quoted; script regex handles both `"` and `'` variants |
| Migration script accidentally rewrites a `status:` line in a code block in the body | Only rewrites within the first `---\n...\n---` block; bytes after the closing `---` are untouched |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/push.ts` `writeAtomic` pattern — script copies the same `tmpfile + renameSync` idiom.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — parse/serialize helpers; script intentionally bypasses these to preserve raw bytes (per FLASHCARD).
- **Surface:** `cleargate-cli/scripts/` directory — sibling `.mjs` scripts (backfill-sprint-reports, copy-planning-payload) provide the boilerplate shape.
- **Coverage of this story's scope:** ~40% — new script + new test, but reuses existing atomic-write idiom and scripts-directory conventions.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** a one-off `sed -i 's/^status: Done$/status: Completed/' .cleargate/delivery/**/*.md` in a commit message.
- **Why isn't extension sufficient?** No idempotency check, no flagged-for-review surface, no lock against concurrent push, no test coverage. A script gives all four; sed gives none. The cost is ~150 LOC + 6 tests; the avoided cost is corrupting a frontmatter mid-push.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: migrate-status-to-completed script

  Scenario: Rewrite Done → Completed
    Given a fixture pending-sync/STORY-FX1.md with frontmatter "status: Done"
    When I run the script with --apply against the fixture tree
    Then STORY-FX1.md reads "status: Completed" after the run
    And the file's body bytes (after the closing ---) are unchanged

  Scenario: Rewrite Verified → Completed
    Given a fixture archive/BUG-FX2.md with "status: Verified"
    When --apply runs
    Then BUG-FX2.md reads "status: Completed"

  Scenario: Leave Completed unchanged
    Given a fixture archive/STORY-FX3.md with "status: Completed"
    When --apply runs
    Then STORY-FX3.md is unchanged (no mtime bump even via tmp-rename)

  Scenario: Idempotency
    Given the fixture tree from Scenario 1+2+3
    When --apply runs twice in a row
    Then the second run reports "Rewrote: 0 files"
    And every file is byte-identical to the post-first-run state

  Scenario: Flag non-terminal stale statuses without rewriting
    Given a fixture archive/STORY-FX4.md with "status: Approved" and archive/STORY-FX5.md with "status: Triaged"
    When --apply runs
    Then neither file is rewritten
    And the summary lists STORY-FX4.md and STORY-FX5.md under "Flagged for human review"

  Scenario: Lock respected by concurrent push
    Given the migration script holds .cleargate/.migration-lock
    When `cleargate push <fixture-item>` is invoked
    Then it exits with code 75 and message includes "CR-067 migration in progress"
```

### 2.2 Verification Steps (Manual)

- [ ] Dry-run against the real repo: count of "Would rewrite" matches CR-067 §0 inventory (~101 Done + ~12 Verified + ~21 quoted variants ≈ 113-134 candidates).
- [ ] After STORY-067-02 lands, re-running --apply reports `Rewrote: 0 files` (idempotency confirmed in production).

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/migrate-status-to-completed.mjs` (NEW) |
| Related Files | `cleargate-cli/src/commands/push.ts` (add lock check at top of push handler) |
| Test File | `cleargate-cli/scripts/migrate-status-to-completed.node.test.ts` (NEW) |
| Fixtures | inline in test file (tmpdir-built per test; no fixtures/ tree) |
| New Files Needed | Yes — 2 (script + test) |

### 3.2 Technical Logic

1. Parse argv: `--dry-run` (default true), `--apply` (sets dry-run false), `--delivery-root` (defaults to `.cleargate/delivery` relative to cwd).
2. If `--apply`, acquire lock:
   ```js
   const lockPath = path.join(opts.deliveryRoot, '..', '.migration-lock');
   try { fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' }); }
   catch (e) { /* exists → check PID alive → reclaim or abort */ }
   ```
3. Walk: `for (const root of ['pending-sync', 'archive']) for (const f of fs.readdirSync(path.join(deliveryRoot, root))) if (f.endsWith('.md')) processFile(...)`.
4. `processFile`:
   - Read raw bytes.
   - Extract first frontmatter block.
   - Within that block, apply line-by-line regex:
     - `/^status:\s*["']?Done["']?\s*$/m` → `status: Completed`
     - `/^status:\s*["']?Verified["']?\s*$/m` → `status: Completed`
   - If a substitution fired: write via tmp+rename.
   - Also detect non-terminal stale (`Approved`, `Draft`, `Triaged`, `"🟢"`) and push to `flaggedForReview[]`.
5. Print summary; release lock; exit 0.

### 3.3 API Contract

CLI only. No exported library.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Script — fixture shapes | 6 | Per §2.1 Gherkin |
| Lock interaction | 1 | push.ts exit-75 path |

### 4.2 Definition of Done

- [ ] Script + tests merged.
- [ ] push.ts checks `.migration-lock` before any frontmatter write.
- [ ] All 6 Gherkin scenarios green.
- [ ] Dry-run against the real repo prints expected ~113-item diff.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.

## Existing Surfaces

> See §1.6.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — fully scoped from CR-067 Phase A.
