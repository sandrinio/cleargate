---
story_id: STORY-072-01
parent_epic_ref: CR-072
parent_cleargate_id: CR-072
sprint_cleargate_id: SPRINT-30
carry_over: false
area: cli/init,security/gitignore
status: "Completed"
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
context_source: |
  Decomposed from CR-072 at SPRINT-30 SDR 2026-05-19. CR-072 is a single
  template-content expansion.

  Audit during decomposition resolved Open Question #2 (template
  location): the file already lives at
  `cleargate-cli/templates/cleargate-planning/.gitignore` (file-based,
  not embedded string). The init command copies this file via the
  existing payload-copy mechanism. No init.ts code change needed —
  just edit the template.

  Audit on Open Question #4 (re-init customization preservation) shows
  the existing copy-payload skip-set covers user-customized .gitignore.
  Verify in tests rather than refactor.

  Critical security driver: a fresh repo with a pre-existing .env
  containing AZDO_PAT (or any secret) is one `git add -A` away from
  leaking credentials into git history. The expanded template puts
  `.env` in .gitignore by default.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:11:20Z
stamp_error: no ledger rows for work_item_id STORY-072-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T16:11:20Z
  sessions: []
---

# STORY-072-01: Expand default `cleargate init` gitignore template — secrets, language artifacts, OS junk

**Complexity:** L1 — one template file edit + four test cases. No source-code changes.

## 1. The Spec

### 1.1 User Story

As a solo developer running `cleargate init` for the first time in a repo that already contains a `.env` file with credentials, I want the default `.gitignore` shipped by init to already ignore `.env`, so that my next `git add -A` does not leak secrets into git history. I also want common Python and Node.js build artifacts ignored by default so I don't accidentally commit `__pycache__/` or `node_modules/` and have to scrub them out later.

### 1.2 Detailed Requirements

1. **Replace the contents** of `cleargate-cli/templates/cleargate-planning/.gitignore` with the expanded canonical block list specified in CR-072 §1 New Logic. The template gains five new sections (Secrets, OS junk, Python, Node.js, ClearGate) with explanatory `# ── Section ──` header lines.
2. **The `.env*` block** is the critical addition:
   ```
   .env
   .env.*
   !.env.example
   !.env.template
   ```
   Allowlists preserve the "ship example, ignore real" convention.
3. **Polyglot by default** — Python AND Node.js blocks both ship even though most projects use one. They're additive and cheap; a Python-only repo carrying `node_modules/` in `.gitignore` costs nothing.
4. **Preserve existing ClearGate blocks** verbatim (worktrees, hook-log, sprint-runs telemetry, participant identity).
5. **Re-init preserves user customizations.** Verified via test, not refactor: the existing `cleargate-cli/src/init/copy-payload.ts` SKIP mechanism already protects the user's `.gitignore` if they edited it post-init. Confirm in tests; if behavior differs, file a follow-up bug rather than expand scope here.
6. **Tests** added to `cleargate-cli/test/commands/init.node.test.ts`:
   - Fresh init produces a `.gitignore` that ignores `.env` (verified via `git check-ignore`).
   - Fresh init `.gitignore` does NOT ignore `.env.example`.
   - Fresh init `.gitignore` contains Python markers (`__pycache__/`, `*.pyc`, `.venv/`, `.pytest_cache/`) and Node markers (`node_modules/`, `.DS_Store`).
   - Fresh init `.gitignore` still contains ClearGate-specific blocks (`.worktrees/`, `/.cleargate/hook-log/`).
   - Re-init in a repo with user-modified `.gitignore` preserves the user's lines.

### 1.3 Out of Scope

- Auto-detection of project type (Python vs Node) to ship only the relevant block. Polyglot-by-default is cheaper and safer.
- Editor / IDE artifacts (`.vscode/`, `.idea/`, `*.swp`) — personal preference; some teams commit `.vscode/` for shared launch configs.
- Changes to the copy-payload mechanism. If audit reveals re-init overwrites user customizations (unexpected behavior), file follow-up bug; don't refactor here.
- Backup-on-overwrite mechanism for re-init. Out of scope for L1; revisit if real users hit it.

### 1.4 Open Questions

None. CR-072 Open Questions resolved:
- Q1 (polyglot vs detect): polyglot. Recommended answer adopted.
- Q2 (template location): file-based — already lives at the cited path. Confirmed by decomposition audit.
- Q3 (IDE artifacts): excluded.
- Q4 (re-init behavior): preserve customization; verify via test.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| `git check-ignore` test depends on tmpdir being inside a git repo | Tests `git init -b main` the tmpdir before running `cleargate init`; check-ignore then resolves correctly. |
| Re-init silently overwrites user customizations (unexpected behavior per audit) | Test 5 explicitly fails if customization is lost. If it fails, log a follow-up bug and document the gap; do NOT relax the test. |
| Allowlist syntax (`!.env.example`) behaves unexpectedly on case-insensitive filesystems (macOS default) | Test 2 asserts `.env.example` specifically (lowercase); macOS HFS+ case-insensitivity is irrelevant to the literal-match `!.env.example` line. |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/templates/cleargate-planning/.gitignore` — the existing template file this story rewrites.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` — payload-copy mechanism that ships the template to the target repo; story does not edit, but verifies behavior.
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init integration tests; story adds five gitignore assertions.
- **Coverage of this story's scope:** ~70% — pure template-content swap; no new code path. Existing copy-payload mechanism does the work.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** prepend five lines (`.env\n.env.*\n!.env.example\n.DS_Store\nnode_modules/\n`) to the existing template.
- **Why isn't extension sufficient?** Five lines fix the `.env` leak but leave the Python and OS-junk gaps. The full expansion is still small (~40 lines total) and adds section headers that make the file legible to a user who later wants to extend it. The cost of "do it once, do it right" is negligible.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate init produces an opinionated default .gitignore

  Scenario: .env is gitignored
    Given a fresh tmpdir with a pre-existing .env file
    When I run `cleargate init` in that tmpdir
    Then `git check-ignore -v .env` exits 0
    And the matching rule is the new template's `.env` line

  Scenario: .env.example is NOT gitignored
    Given a fresh tmpdir with .env and .env.example files
    When I run `cleargate init` in that tmpdir
    Then `git check-ignore .env.example` exits 1

  Scenario: Python and Node markers present
    Given a fresh tmpdir
    When I run `cleargate init` in that tmpdir
    Then the resulting .gitignore contains "__pycache__/"
    And contains "*.pyc"
    And contains ".venv/"
    And contains ".pytest_cache/"
    And contains "node_modules/"
    And contains ".DS_Store"

  Scenario: ClearGate blocks preserved
    Given a fresh tmpdir
    When I run `cleargate init` in that tmpdir
    Then the resulting .gitignore contains ".worktrees/"
    And contains "/.cleargate/hook-log/"
    And contains "/.cleargate/.participant.json"

  Scenario: re-init preserves user customization
    Given a tmpdir where `cleargate init` ran once
    And the user appended a custom block to .gitignore
    When I run `cleargate init` again
    Then the user's custom block survives in .gitignore
```

### 2.2 Verification Steps (Manual)

- [ ] In a fresh tmpdir with a pre-existing `.env` containing `SECRET=abc`, run `cleargate init`. Confirm `git status` shows no `.env`.
- [ ] Read the produced `.gitignore` — section headers are legible.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/templates/cleargate-planning/.gitignore` |
| Related Files | `cleargate-cli/src/init/copy-payload.ts` (verified by tests, not edited) |
| Test File | `cleargate-cli/test/commands/init.node.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic

1. Open `cleargate-cli/templates/cleargate-planning/.gitignore`.
2. Replace contents with the expanded block list per CR-072 §1 New Logic, organized under five section headers (Secrets / OS junk / Python / Node.js / ClearGate per-participant / ClearGate worktrees / ClearGate telemetry).
3. Run `cd cleargate-cli && npm run prebuild` to mirror to `cleargate-cli/dist/templates/cleargate-planning/.gitignore` (if `dist/` is part of the published artifact path).
4. Tests in `cleargate-cli/test/commands/init.node.test.ts` use real-process spawn + `git check-ignore` to assert behavior, not just file contents.

### 3.3 API Contract

N/A — template-content change only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration — `git check-ignore` for `.env` | 1 | Critical security path |
| Integration — `.env.example` allowlisted | 1 | Verify the `!` allowlist works |
| Unit — file-contents pattern presence | 2 | Python markers + Node markers + ClearGate markers split into two tests |
| Integration — re-init preserves customization | 1 | Documents existing behavior; flips to bug-filing if it fails |

### 4.2 Definition of Done

- [ ] `cleargate-cli/templates/cleargate-planning/.gitignore` rewritten with expanded blocks + section headers.
- [ ] `npm run prebuild` re-mirrors the dist copy.
- [ ] All five Gherkin scenarios covered by tests in `cleargate-cli/test/commands/init.node.test.ts`.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Manual: pre-existing `.env` is not staged after fresh init.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/init/copy-payload.ts` — payload-copy mechanism that ships the gitignore template to target repos; story does not edit, verifies via test.
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init integration tests; story adds five new assertions covering the expanded ignore patterns.
- **Surface:** `cleargate-cli/templates/cleargate-planning/CLAUDE.md` — sibling file in the same payload directory; cited here as proof of the canonical payload-template directory location where the gitignore template lives (the template file itself has a leading-dot filename that the readiness gate's path parser cannot tokenize — see STORY-073-01 for the fix).
- **Coverage of this story's scope:** ~70% — pure template-content swap reusing the existing copy-payload pipeline.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — template location and block list both fully specified.

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.
