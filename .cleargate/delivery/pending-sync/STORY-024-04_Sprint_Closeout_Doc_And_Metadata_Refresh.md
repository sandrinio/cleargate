---
story_id: STORY-024-04-Sprint_Closeout_Doc_And_Metadata_Refresh
parent_epic_ref: EPIC-024
sprint_cleargate_id: "SPRINT-17"
parent_cleargate_id: EPIC-024
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: "EPIC-024 + .cleargate/scratch/SDLC_brainstorm.md (de-facto charter). User requested 2026-05-01: 'create a story for README and metadata changes at the end of the sprint'. Loose thematic fit under EPIC-024 — READMEs / CHANGELOG / MANIFEST / CLAUDE.md 'Active state' / wiki / INDEX surfaces are the *human-facing* orientation layer (parallel to EPIC-024's *AI-facing* slim). Inherits parent EPIC-024's Gate 1 waiver via context_source."
actor: Conversational orchestrator (during sprint close) + downstream automation (CR-022 will wire into close_sprint.mjs)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-05-01T21:00:00Z
updated_at: 2026-05-01T21:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T06:05:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-024-04-Sprint_Closeout_Doc_And_Metadata_Refresh
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T06:05:05Z
  sessions: []
---

# STORY-024-04: Sprint Closeout Doc & Metadata Refresh Checklist
**Complexity:** L2 — one new knowledge doc + one new script + 1-line CLAUDE.md reference, all mirrored to canonical scaffold.

**Wave:** 1 (parallel with STORY-024-01 and STORY-024-03; disjoint surface from STORY-024-02). The new files in this story do not collide with the protocol split (024-02), the architect prompt edit (024-01), or the CLAUDE.md gap-fill (024-03).

**Lane:** `standard` — exceeds the 2-file size cap of fast lane (5 files: 1 knowledge doc + 1 script + 1 CLAUDE.md addition × 2 mirrors). Doc + small script; no forbidden surfaces; low exposure.

## 1. The Spec (The Contract)

### 1.1 User Story

As a **vibe coder running a ClearGate sprint to close**, I want a single canonical checklist that surfaces every README / CHANGELOG / MANIFEST / CLAUDE.md "Active state" / wiki / INDEX / frontmatter-version-stamp surface that may need updating based on what shipped this sprint, so that human-facing orientation stays in sync with the actual codebase and stakeholders reading the README see what's actually true.

### 1.2 Detailed Requirements

**Create knowledge doc** at `.cleargate/knowledge/sprint-closeout-checklist.md` (and canonical mirror). The doc enumerates every doc/metadata surface, organized by category, with a one-line "when to review" trigger per item. Categories:

1. **Project READMEs**
   - Top-level `README.md`
   - `cleargate-cli/README.md`
   - `cleargate-planning/README.md` (if exists)
   - `mcp/README.md`
   - `admin/README.md`
2. **CHANGELOG files** (Common-Changelog format per STORY-016-03)
   - `cleargate-cli/CHANGELOG.md`
   - `mcp/CHANGELOG.md` (if exists)
3. **Manifest / package metadata**
   - `cleargate-planning/MANIFEST.json` (scaffold registry — checked by `cleargate doctor`)
   - `cleargate-cli/package.json` (version bump if releasing)
   - `mcp/package.json` (version bump if releasing)
4. **CLAUDE.md "Active state" subsection** (date + line summary of what now ships)
   - `CLAUDE.md` lines 79–84 (current "Active state" subsection)
   - `cleargate-planning/CLAUDE.md` mirror
5. **Wiki surfaces** (auto-rebuilt by PostToolUse hooks; verify after close)
   - `.cleargate/wiki/active-sprint.md`
   - `.cleargate/wiki/index.md`
   - `.cleargate/wiki/product-state.md`
   - `.cleargate/wiki/roadmap.md`
6. **INDEX surfaces** (manual updates per protocol)
   - `.cleargate/INDEX.md` (curated roadmap, if maintained)
   - `.cleargate/delivery/INDEX.md`
7. **Frontmatter version stamps** (run `cleargate stamp` on modified templates / protocol / knowledge docs)
   - Any `.cleargate/templates/*.md` modified this sprint
   - `.cleargate/knowledge/cleargate-protocol.md` (post-EPIC-024 slim)
   - `.cleargate/knowledge/cleargate-enforcement.md` (post-EPIC-024 split)
   - Any other `.cleargate/knowledge/*.md` touched
8. **Knowledge doc cross-references**
   - Any knowledge doc that cites `§N` of protocol or enforcement.md — verify post-rewrite resolution still works (covered separately by STORY-024-02 for SPRINT-17 specifically)
9. **Mirror parity** (audit at close — should already be invariant per per-edit mirror rule)
   - `diff` each `cleargate-planning/` mirror against its live counterpart

Each item carries a **trigger condition** in the checklist:

```markdown
- [ ] cleargate-cli/README.md — review if any cleargate-cli/src/commands/*.ts file changed
- [ ] cleargate-planning/MANIFEST.json — verify if any .claude/agents/*.md, .cleargate/templates/*, .cleargate/knowledge/*, or .cleargate/scripts/* file changed (`cleargate doctor` enforces)
- [ ] CLAUDE.md "Active state" — review if any EPIC / CR / Bug / Hotfix archived this sprint, OR stack version bumped
- [ ] cleargate-cli/CHANGELOG.md — entry needed if cleargate-cli/ has user-visible changes (CLI surface, error messages, package contents)
- [ ] cleargate-cli/package.json version bump — only if releasing this sprint (release lane separate from sprint close)
- [ ] cleargate stamp — run on every modified template / protocol / knowledge doc (bumps `updated_at_version`)
- [ ] mirror diff — `diff -r cleargate-planning/.claude/ .claude/` and `diff -r cleargate-planning/.cleargate/ .cleargate/` (excluding gitignored runtime dirs)
```

**Create script** at `.cleargate/scripts/prep_doc_refresh.mjs <sprint-id>`. Behavior:

1. Reads `git log sprint/S-NN ^main --name-only` (or falls back to `--since <start_date>` if sprint branch already merged)
2. Deduplicates the changed-file set
3. For each checklist category, evaluates whether any changed file matches the category's trigger pattern
4. Writes `.cleargate/sprint-runs/<sprint-id>/.doc-refresh-checklist.md` containing:
   - Items where trigger fired → `- [ ] <item>` (action required)
   - Items where trigger did NOT fire → `- [x] <item> — no changes detected, skip` (auto-completed)
5. Does NOT modify any docs itself — produces the checklist only. Application is human-driven (or downstream automation in CR-022).

**Add 1-line CLAUDE.md reference** in the CLEARGATE-tag-block region, in the session-start orientation list as a tier-5 entry OR in the close-related guardrail text:

```markdown
**Sprint close — refresh human surfaces.** During Gate 4 ack, read `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (generated by `prep_doc_refresh.mjs`) and apply or punt each `- [ ]` item per the canonical list at `.cleargate/knowledge/sprint-closeout-checklist.md`.
```

(Exact wording can be adjusted at draft time; the requirement is that CLAUDE.md cite both the canonical checklist and the per-sprint tailored output.)

### 1.3 Out of Scope

- **Wiring into `close_sprint.mjs`.** Deferred to CR-022 (Gate 4 hardening) — that CR's Step 8 (verbose post-close hand-off list) and Step 6.8 (proposed) own the script invocation. STORY-024-04 produces the artifacts; CR-022 wires automation.
- **Actually performing the doc refresh for SPRINT-17 close.** That happens during SPRINT-17's own Close phase (using STORY-024-04's just-shipped checklist as eat-your-own-dogfood). Not part of this story's commit.
- **Auto-running `cleargate stamp`.** The checklist surfaces stamp candidates; it does NOT execute them. `cleargate stamp` invocation stays human-controlled per protocol §11.2 stamp-invocation rules.
- **Modifying any README / CHANGELOG / MANIFEST as part of this story.** This story produces the checklist + the script; it does not refresh docs.
- **Wiki rebuild logic changes.** Wiki surfaces are listed in the checklist as "verify after auto-rebuild"; the auto-rebuild mechanism (PostToolUse hook) is unchanged.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint closeout doc & metadata refresh checklist

  Scenario: Canonical checklist exists at the documented location
    Given STORY-024-04 has merged
    When .cleargate/knowledge/sprint-closeout-checklist.md is read
    Then it contains at least 9 named categories (Project READMEs / CHANGELOG / Manifest / CLAUDE.md Active state / Wiki / INDEX / Frontmatter stamps / Knowledge cross-refs / Mirror parity)
    And each category lists every file path it covers (no "etc." catch-alls)
    And each item carries a trigger condition stating when review is needed

  Scenario: Mirror parity preserved on the new knowledge doc
    Given STORY-024-04 has merged
    When `diff .cleargate/knowledge/sprint-closeout-checklist.md cleargate-planning/.cleargate/knowledge/sprint-closeout-checklist.md` runs
    Then the diff is empty

  Scenario: Script generates a per-sprint tailored checklist
    Given STORY-024-04 has merged
    And a sprint S-NN has been closed with a known set of changed files (test fixture)
    When `node .cleargate/scripts/prep_doc_refresh.mjs S-NN` runs
    Then it writes .cleargate/sprint-runs/S-NN/.doc-refresh-checklist.md
    And every category from the canonical checklist appears in the output
    And each item is marked `- [ ]` (action required) if any changed file matches its trigger pattern
    And each item is marked `- [x] ... no changes detected, skip` if no changed file matches its trigger

  Scenario: Script handles edge cases gracefully
    Given STORY-024-04 has merged
    When `node .cleargate/scripts/prep_doc_refresh.mjs S-99` runs against a non-existent sprint
    Then it exits 1 with a clear error message ("sprint state.json not found at ...")
    And it does NOT write any file

  Scenario: CLAUDE.md references the checklist
    Given STORY-024-04 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is read
    Then it contains a reference to .cleargate/knowledge/sprint-closeout-checklist.md
    And it contains a reference to .doc-refresh-checklist.md (the per-sprint output)
    And the reference is mirrored to cleargate-planning/CLAUDE.md byte-identically within the CLEARGATE block

  Scenario: Script does not modify any documentation
    Given STORY-024-04 has merged
    When the script runs against any sprint fixture
    Then `git status --porcelain` shows changes only to `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (and possibly token-ledger artifacts)
    And no README, CHANGELOG, MANIFEST.json, package.json, CLAUDE.md, INDEX.md, wiki/, or knowledge/*.md file has been modified by the script

  Scenario: Outside-block content unchanged
    Given STORY-024-04 has merged
    When `git diff <pre-merge-sha> HEAD -- CLAUDE.md cleargate-planning/CLAUDE.md` is examined
    Then every changed line falls within the <!-- CLEARGATE:START --> ... <!-- CLEARGATE:END --> region
```

### 2.2 Verification Steps (Manual)

- [ ] Read `.cleargate/knowledge/sprint-closeout-checklist.md` end-to-end. Confirm all 9 categories present, every file path enumerated.
- [ ] Run `node .cleargate/scripts/prep_doc_refresh.mjs SPRINT-16` (most recently closed sprint as fixture). Inspect `.cleargate/sprint-runs/SPRINT-16/.doc-refresh-checklist.md`. Verify items mapped correctly against actual SPRINT-16 changed files.
- [ ] Verify `diff -r .cleargate/knowledge/sprint-closeout-checklist.md cleargate-planning/.cleargate/knowledge/sprint-closeout-checklist.md` empty.
- [ ] Verify CLEARGATE-tag-block region of CLAUDE.md mirrors byte-identically to `cleargate-planning/CLAUDE.md`.
- [ ] Run `git status --porcelain` after script run — confirm no stray edits to docs.
- [ ] Run `cleargate doctor` — exits 0 (no MANIFEST drift introduced by the new files).
- [ ] Run `cleargate wiki lint` — exits 0.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** every file staged in this story's commit must appear below.

**Files to create:**

- `.cleargate/knowledge/sprint-closeout-checklist.md` — primary knowledge doc (canonical content).
- `cleargate-planning/.cleargate/knowledge/sprint-closeout-checklist.md` — canonical mirror (byte-identical).
- `.cleargate/scripts/prep_doc_refresh.mjs` — generator script (~120 LOC).

**Files to modify:**

- `CLAUDE.md` — CLEARGATE-tag-block region only; add 1-line reference to the new checklist + per-sprint output.
- `cleargate-planning/CLAUDE.md` — canonical mirror (CLEARGATE-block region only).

**Manifest impact:**

- After commit, `cleargate-planning/MANIFEST.json` may need a new entry for the new knowledge doc — verify with `cleargate doctor`.

### 3.2 Technical Logic

**Knowledge doc structure** (`.cleargate/knowledge/sprint-closeout-checklist.md`):

```markdown
# Sprint Closeout Doc & Metadata Refresh Checklist

> Read at sprint close (Gate 4 ack). Each item names a surface that may need
> updating based on what shipped this sprint. Trigger conditions tell you when
> review is required vs when the surface can be skipped.
>
> Use `node .cleargate/scripts/prep_doc_refresh.mjs <sprint-id>` to generate
> a per-sprint tailored checklist that pre-checks items based on actual
> changed files in the sprint window.

### 1. Project READMEs
| Surface | Trigger condition |
|---|---|
| `README.md` | Any feature shipped that changes user-visible product behavior |
| `cleargate-cli/README.md` | Any change to `cleargate-cli/src/commands/*.ts` |
| `cleargate-planning/README.md` | Any change under `cleargate-planning/` |
| `mcp/README.md` | Any change under `mcp/src/` (note: nested repo; check separately) |
| `admin/README.md` | Any change under `admin/` (currently stub) |

### 2. CHANGELOG files (Common-Changelog format per STORY-016-03)
| Surface | Trigger condition |
|---|---|
| `cleargate-cli/CHANGELOG.md` | Any user-visible change in `cleargate-cli/` (CLI surface, error messages, package contents) |
| `mcp/CHANGELOG.md` | Any user-visible change in `mcp/` (if file exists) |

### 3. Manifest / package metadata
| Surface | Trigger condition |
|---|---|
| `cleargate-planning/MANIFEST.json` | Any change to `.claude/agents/*.md`, `.cleargate/templates/*`, `.cleargate/knowledge/*`, or `.cleargate/scripts/*`. Run `cleargate doctor` to verify scaffold registry. |
| `cleargate-cli/package.json` | Version bump only if releasing this sprint (release lane is separate from sprint close) |
| `mcp/package.json` | Version bump only if releasing this sprint |

### 4. CLAUDE.md "Active state" subsection
| Surface | Trigger condition |
|---|---|
| `CLAUDE.md` lines containing "Active state (as of YYYY-MM-DD)" | Any EPIC / CR / Bug / Hotfix archived this sprint, OR any stack version bumped |
| `cleargate-planning/CLAUDE.md` mirror | Same edit as live (CLEARGATE-tag-block region only — outside-block diverges intentionally) |

### 5. Wiki surfaces (auto-rebuilt by PostToolUse hooks; verify after close)
| Surface | Verify by |
|---|---|
| `.cleargate/wiki/active-sprint.md` | Read top of file; confirm sprint ID, status, and date are current |
| `.cleargate/wiki/index.md` | Read; confirm new artifacts (epics, stories, CRs) appear in the relevant sections |
| `.cleargate/wiki/product-state.md` | Read; confirm shipped capabilities are listed |
| `.cleargate/wiki/roadmap.md` | Read; confirm closed sprint moved from Active to Completed section |

### 6. INDEX surfaces (manual updates)
| Surface | Trigger condition |
|---|---|
| `.cleargate/INDEX.md` | If maintained as a curated roadmap; update when sprint closes |
| `.cleargate/delivery/INDEX.md` | Update epic/sprint map when new artifacts archived |

### 7. Frontmatter version stamps
| Surface | Action |
|---|---|
| Any `.cleargate/templates/*.md` modified this sprint | Run `cleargate stamp <path>` to bump `updated_at_version` |
| `.cleargate/knowledge/cleargate-protocol.md` (post-EPIC-024 slim) | Same |
| `.cleargate/knowledge/cleargate-enforcement.md` (post-EPIC-024 split) | Same |
| Any other `.cleargate/knowledge/*.md` modified | Same |

### 8. Knowledge doc cross-references
| Surface | Action |
|---|---|
| Any knowledge doc that cites `§N` of protocol or enforcement.md | Verify post-rewrite resolution still works (covered for SPRINT-17 specifically by STORY-024-02; revisit if any future § reorganization happens) |

### 9. Mirror parity audit
| Surface | Action |
|---|---|
| `cleargate-planning/.claude/` | `diff -r .claude/agents/ cleargate-planning/.claude/agents/` empty (excluding skills/ flashcards/, hooks/, settings.json which differ intentionally) |
| `cleargate-planning/.cleargate/templates/` | `diff -r .cleargate/templates/ cleargate-planning/.cleargate/templates/` empty |
| `cleargate-planning/.cleargate/knowledge/` | `diff -r .cleargate/knowledge/ cleargate-planning/.cleargate/knowledge/` empty |
```

**Script outline** (`.cleargate/scripts/prep_doc_refresh.mjs`, ~120 LOC):

```javascript
#!/usr/bin/env node
/**
 * prep_doc_refresh.mjs <sprint-id>
 *
 * Generates a per-sprint tailored doc-refresh checklist by scanning what
 * changed in the sprint window and matching trigger patterns from the
 * canonical checklist at .cleargate/knowledge/sprint-closeout-checklist.md.
 *
 * Output: .cleargate/sprint-runs/<sprint-id>/.doc-refresh-checklist.md
 *
 * Each canonical-checklist category is evaluated; items where the trigger
 * pattern matches at least one changed file get `- [ ]`; items where it
 * does not get `- [x] — no changes detected, skip`.
 *
 * Does NOT modify any documentation. Application is human-driven.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CATEGORIES = [
  // Each entry: { name, items: [{ surface, trigger: regex against changed file paths }] }
  // ... 9 categories matching the knowledge doc structure
];

function getChangedFiles(sprintId) {
  // Strategy 1: if sprint branch exists, use `git log sprint/S-NN ^main --name-only`
  // Strategy 2: fallback to --since <start_date> from sprint frontmatter
  // Returns: deduped array of changed file paths
}

function evaluateChecklist(changedFiles) {
  // For each category and item, test trigger.regex against changedFiles
  // Returns: { category: [{ surface, action: 'review' | 'skip', reason: string }] }
}

function renderChecklist(evaluation, sprintId) {
  // Render markdown with `- [ ]` for review, `- [x] ... no changes detected, skip` for skip
}

function main() {
  const sprintId = process.argv[2];
  if (!sprintId) { /* usage error → exit 2 */ }

  const sprintDir = path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);
  if (!fs.existsSync(sprintDir)) { /* exit 1, error message */ }

  const changedFiles = getChangedFiles(sprintId);
  const evaluation = evaluateChecklist(changedFiles);
  const markdown = renderChecklist(evaluation, sprintId);

  const outFile = path.join(sprintDir, '.doc-refresh-checklist.md');
  fs.writeFileSync(outFile, markdown, 'utf8');
  console.log(`Wrote ${outFile}`);
}

main();
```

**CLAUDE.md addition** — within the CLEARGATE-tag-block region, near the close-related guardrails (probably after the "Sprint close is Gate-4-class (CR-019)" bullet that CR-020 introduces, or at end of CLEARGATE block):

```markdown
**Doc & metadata refresh on close.** During Gate 4 ack, read `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (generated by `prep_doc_refresh.mjs`) and apply or punt each `- [ ]` item per the canonical list at `.cleargate/knowledge/sprint-closeout-checklist.md`. Items already marked `- [x]` indicate "no changes detected, skip."
```

### 3.3 API Contract

N/A — no runtime API surface. Script is local-only; knowledge doc is read-only documentation; CLAUDE.md edit is doc-only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Acceptance scenarios pass | 7 | Per Gherkin in §2.1 |
| Mirror diff | 2 | knowledge doc + CLAUDE.md CLEARGATE-block |
| Script unit test | 1 | At minimum, runs against a fixture sprint and produces well-formed markdown output |
| Existing test pass | 4 | `cleargate doctor`, `cleargate wiki lint`, `state-scripts.test.mjs`, `test_ratchet.mjs` |

### 4.2 Definition of Done

- [ ] All §2.1 Gherkin scenarios pass.
- [ ] `.cleargate/knowledge/sprint-closeout-checklist.md` mirrored to canonical (empty diff).
- [ ] `prep_doc_refresh.mjs` runs successfully against SPRINT-16 fixture (most recently closed sprint as of draft time).
- [ ] CLAUDE.md CLEARGATE-tag-block region byte-identical between live and canonical.
- [ ] Outside-block content of CLAUDE.md and `cleargate-planning/CLAUDE.md` unchanged.
- [ ] `cleargate doctor` exits 0.
- [ ] `cleargate wiki lint` exits 0.
- [ ] Architect (gate review) approves.
- [ ] Commit message: `feat(EPIC-024): STORY-024-04 sprint closeout doc & metadata refresh checklist`.
- [ ] STORY-024-04 added to EPIC-024's IN-SCOPE list (parent epic update).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (7 scenarios; one per major behavior).
- [x] Implementation Guide (§3) maps to specific, verified file paths (paths exist or are clearly NEW with parent dirs verified).
- [x] No "TBDs" remain.
