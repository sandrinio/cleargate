---
story_id: STORY-073-01
parent_epic_ref: CR-073
parent_cleargate_id: CR-073
sprint_cleargate_id: SPRINT-30
carry_over: false
area: cli/readiness-gates
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
  Decomposed from CR-073 at SPRINT-30 SDR 2026-05-19. CR-073 is a one-line
  regex change with matching test fixtures.

  Discovered 2026-05-19 while activating SPRINT-30: six of seven SPRINT-30
  items hit existing-surfaces-verified false positives because the parser
  extracts tokens like `state.execu` (from `state.execution_mode`),
  `.gitig` (from `.gitignore`), and bare filenames (`init.ts`) from prose.

  Fix: require at least one `/` in the path body before the extension.
  Root-level files now require `./` prefix (small cost; documented in
  template guidance).

  Tightening is a SUPERSET relaxation in failure terms — anything that
  passed the old (permissive) regex passes the new (tighter) one, except
  the false-positive cases we're trying to reject.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:05:07Z
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-7
  last_stamp: 2026-05-19T16:56:32Z
  sessions:
    - session: 1ab577c1-dab2-482f-85ac-f5263801f3bc
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-19T16:55:15Z
---

# STORY-073-01: Tighten readiness-gate path-extractor regex to require directory separator

**Complexity:** L1 — one regex line + matching test fixtures + one-line guidance in CR template.

## 1. The Spec

### 1.1 User Story

As a CR/Story author writing the §Existing Surfaces section, I want the readiness gate to only treat tokens that look like paths (containing at least one `/`) as path citations, so that natural-language prose mentioning bare filenames or dotted code-references (`state.execution_mode`, `req.body.user`) does NOT trip false-positive "path does not exist" failures.

### 1.2 Detailed Requirements

1. **Tighten** the `PATH_RE` regex inside `evalExistingSurfacesVerified` at `cleargate-cli/src/lib/readiness-predicates.ts`. Replace:
   ```ts
   const PATH_RE = /[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g;
   ```
   With:
   ```ts
   const PATH_RE = /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]*\.[a-zA-Z]{1,5}(?::[a-zA-Z0-9_]+)?/g;
   ```
   The new regex requires at least one `/` between the start of the token and the final `.ext`. The trailing `:anchor` capture accepts both alphabetic symbol names (`:fetchIssues`) and numeric line numbers (`:42`) — required by §2.1 Scenario 6 (`foo.ts:42`).
2. **Effects on existing behavior:**
   - `init.ts` (bare filename in prose) — no longer matches.
   - `state.execution_mode` (dotted code reference) — no longer matches.
   - `.gitignore` (no slash before the would-be extension) — no longer matches.
   - `cleargate-cli/src/commands/init.ts` (legitimate path citation) — still matches.
   - `./CLAUDE.md` (root file with explicit prefix) — still matches.
   - `cleargate-cli/src/commands/init.ts:452` (path with line-anchor) — still matches.
3. **Add test cases** to `cleargate-cli/test/lib/readiness-predicates.node.test.ts`:
   - Bare filename in prose → zero matches.
   - Code-reference (`state.foo.bar`) → zero matches.
   - Bare dotfile (`.gitignore`) → zero matches.
   - Full slash path (`a/b/file.ts`) → one match.
   - Root file with `./` prefix → one match.
   - Path with line-anchor (`a/b/c.ts:42`) → one match.
4. **Add one-line guidance** to `.cleargate/templates/CR.md` under the §Existing Surfaces preamble: "Cite paths with at least one `/` separator; for root-level files use `./name.ext` form."
5. **No changes** to the predicate's sandbox check or existence check — they stay as-is. Pure regex tightening.

### 1.3 Out of Scope

- Structured-citation syntax (e.g. `[surface]: path/to/file.ts`). Deferred to a follow-up CR per CR-073 Open Question #2.
- Auditing existing archived items in `.cleargate/delivery/archive/` for regex compatibility. Their gates already passed under the old (more permissive) regex; the new regex is a tightening, so they remain valid (anything that was a real path before still is).
- Rewriting the story.md template's parallel `§1.6 Existing Surfaces` guidance — story template and CR template share the same preamble pattern; one edit covers both. Verify in story-template review pass.

### 1.4 Open Questions

None. CR-073 Open Questions resolved:
- Q1 (approach): require `/` in path body. Recommended answer adopted.
- Q2 (structured-citation marker): deferred to follow-up.
- Q3 (root files): require `./` prefix.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Some existing pending-sync item cites a root file as bare `CLAUDE.md` and silently fails the gate after tightening | Pre-merge grep for bare-root-file citations in `.cleargate/delivery/pending-sync/**/*.md`. None expected (most cite full paths), but verify. |
| Test regex on macOS sed/grep differs from Node regex engine | Tests run via `tsx --test`; Node regex engine is canonical. No sed/grep involvement. |
| The line-anchor suffix (`:symbol` form) parses differently after tightening | Test 6 explicitly covers line-anchor paths; the regex preserves the `(?::[a-zA-Z_]...)?` capture group. |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — the `PATH_RE` regex inside `evalExistingSurfacesVerified`; this story tightens it in place.
- **Surface:** `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — existing predicate test file; story adds six new test cases.
- **Surface:** `.cleargate/templates/CR.md` — the CR template's §Existing Surfaces preamble gains a one-line slash-required guidance.
- **Coverage of this story's scope:** ~80% — single regex replacement + test additions in existing files; one-line template note.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** the regex line itself in `readiness-predicates.ts`. Truly the entire fix.
- **Why isn't extension sufficient?** The single-line change IS the fix. The story wraps it with six new test cases (one per false-positive category we observed) and a one-line template guidance so future authors learn the rule. Without the tests, a future contributor could relax the regex and reintroduce the false positives unnoticed.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: readiness-gate path extractor rejects code-references and bare filenames

  Scenario: bare filename in prose does not match
    Given input "the init.ts file does foo"
    When PATH_RE is applied
    Then zero matches are produced

  Scenario: dotted code reference does not match
    Given input "the branch on state.execution_mode is collapsed"
    When PATH_RE is applied
    Then zero matches are produced

  Scenario: bare dotfile does not match
    Given input ".gitignore needs expansion"
    When PATH_RE is applied
    Then zero matches are produced

  Scenario: valid relative path matches
    Given input "Surface: cleargate-cli/src/commands/init.ts — the init body"
    When PATH_RE is applied
    Then exactly one match is produced
    And the match equals "cleargate-cli/src/commands/init.ts"

  Scenario: root file with ./ prefix matches
    Given input "Surface: ./CLAUDE.md — bounded block"
    When PATH_RE is applied
    Then exactly one match is produced
    And the match equals "./CLAUDE.md"

  Scenario: path with line-anchor matches
    Given input "Surface: cleargate-cli/src/lib/foo.ts:42 — the helper"
    When PATH_RE is applied
    Then exactly one match is produced
    And the match equals "cleargate-cli/src/lib/foo.ts:42"
```

### 2.2 Verification Steps (Manual)

- [ ] Run `cleargate gate check` against an existing SPRINT-30 item that previously hit false positives — pass.
- [ ] Run `cleargate gate check` against a sample item that cites only bare `CLAUDE.md` (constructed fixture) — gate now fails with a useful message. (Confirms behavior change is observable.)
- [ ] `cd cleargate-cli && npm test -- --grep "PATH_RE"` green.
- [ ] `npm run typecheck` clean.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/readiness-predicates.ts` |
| Related Files | `.cleargate/templates/CR.md` (one-line guidance addition) |
| Test File | `cleargate-cli/test/lib/readiness-predicates.node.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic

1. Locate `evalExistingSurfacesVerified` in `cleargate-cli/src/lib/readiness-predicates.ts`. Find the `PATH_RE` const declaration.
2. Replace the regex body per §1.2.
3. Run `cd cleargate-cli && npm test -- --grep "evalExistingSurfacesVerified"` to confirm existing predicate tests still pass.
4. Append six new test cases (one per Gherkin scenario) to `cleargate-cli/test/lib/readiness-predicates.node.test.ts`. Use a `describe('PATH_RE tightening', ...)` block.
5. Open `.cleargate/templates/CR.md`. Locate the §Existing Surfaces preamble (the blockquote that says `> L1 reuse audit. List source-tree implementations...`). Add one line below it: `> Cite paths with at least one '/' separator; root files use './name.ext'. Bare filenames and dotted code references are ignored.`
6. Mirror the template guidance change in `.cleargate/templates/story.md` §1.6 if the same preamble exists there.

### 3.3 API Contract

N/A — internal regex change.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit — regex match cases | 6 | One per §2.1 Gherkin scenario |
| Existing predicate tests | unchanged | Must continue to pass; no regression |

### 4.2 Definition of Done

- [ ] `cleargate-cli/src/lib/readiness-predicates.ts` carries the tightened `PATH_RE`.
- [ ] Six new test cases in `cleargate-cli/test/lib/readiness-predicates.node.test.ts` pass.
- [ ] `.cleargate/templates/CR.md` (and story.md mirror, if applicable) carry the slash-required guidance line.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Manual: re-running `cleargate gate check` on a known-tripped SPRINT-30 item passes without §Existing Surfaces rewrites.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — the `PATH_RE` regex inside `evalExistingSurfacesVerified`; this story tightens it in place.
- **Surface:** `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — existing predicate test file; story adds six new cases under a `PATH_RE tightening` describe block.
- **Surface:** `.cleargate/templates/CR.md` — gains a one-line slash-required guidance in the §Existing Surfaces preamble.
- **Surface:** `.cleargate/templates/story.md` — parallel mirror of the same guidance (if the same preamble exists; verify during execution).
- **Coverage of this story's scope:** ~80% — single regex replacement plus test additions in existing files plus a one-line template note.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — one-line regex change with matching test fixtures.

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.
