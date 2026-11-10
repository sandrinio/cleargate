---
cr_id: CR-125
parent_ref: EPIC-008
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
area: readiness-gates,templates
context_source: "Owner, 2026-10-28: agreed to suggestion 5 from the Elephant-Goldfish Model comparison (a scoped-down drift check on cited surfaces) with 'create epics/stories accordingly. i agree with your suggestions'. Scope narrowed after measuring: CR-038 already re-runs every sprint item's gate at preflight Step 0, so the remaining gap is that existing-surfaces-verified strips the :symbol / :NN suffix (cleargate-cli/src/lib/readiness-predicates.ts:954) and checks only that the file exists. Measured 2026-10-28 across pending-sync: 56 items carry ## Existing Surfaces; 145 suffixed citations point at existing files, all 145 are line numbers, 0 are symbols; 1 is past end of file (CR-101 cites cleargate-planning/.claude/hooks/token-ledger.sh:612, a 559-line file)."
created_at: 2026-10-28T00:00:00Z
updated_at: 2026-10-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-28T07:01:50Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-125
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T10:57:30Z
  sessions: []
---

# CR-125: `existing-surfaces-verified` Checks Cited Symbols

## 0.5 Open Questions

- **Question:** Does a missing symbol fail the predicate, or only warn?
- **Recommended:** Fail, the same as a missing path. Preflight Step 0 (CR-038) already re-evaluates every sprint item, so a stale citation shows up before execution, and the fix is a one-line edit to the citation.
- **Human decision:** Accepted 2026-10-28 (owner): fail, the same as a missing path.

- **Question:** Should the templates stop suggesting line-number citations?
- **Recommended:** Yes. Change the `## Existing Surfaces` placeholder in epic, story and CR templates from `path/to/file.ext:NN` to `path/to/file.ext:symbolName`, and add one sentence: "For a markdown file, cite the file and name the section in words." Line-number citations keep working, but they can only be bounds-checked.
- **Human decision:** Accepted 2026-10-28 (owner): the placeholder becomes `path/to/file.ext:symbolName`, with the sentence on markdown files.

- **Question:** Is this worth doing now? Measured today it catches one stale citation out of 145. Its value is in making future citations checkable, which only happens if the template change lands too.
- **Recommended:** Yes, as a small CR scheduled next to [[BUG-064]], which edits the same regex.
- **Human decision:** Accepted 2026-10-28 (owner): do it, scheduled next to [[BUG-064]].

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `existing-surfaces-verified` strips any `:symbol` or `:NN` suffix from a cited path and checks only that the file exists (`readiness-predicates.ts:954`). A citation whose function was renamed, or whose line no longer exists, passes.
- The `## Existing Surfaces` placeholder in the epic, story and CR templates suggests `path/to/file.ext:NN`, which no check can verify beyond file length.

**New Logic (The New Truth):**
- For a citation `path:identifier` (suffix not all digits), the identifier must appear in the file as a whole word (`\bidentifier\b`). Otherwise the predicate fails with `cited symbol not found: <path>:<identifier>`.
- For a citation `path:NN` (suffix all digits), the file must have at least NN lines. Otherwise the predicate fails with `cited line past end of file: <path>:<NN> (<count> lines)`.
- A citation that resolves as a planned deliverable (`isPlannedDeliverable`, the forward-reference rule) skips the suffix check, because the file does not exist yet.
- Citation shapes `PATH_RE` only partly captures are checked on the part it captures, and this is accepted: a range `path:171-180` is bounds-checked on `171`; a dotted `path:Class.method` is checked for `Class`. The word check is plain text, not a parse of the code, so a symbol that survives only in a comment still passes.
- The three templates' placeholder becomes `path/to/file.ext:symbolName`, with the sentence on markdown files.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: none. No in-flight story depends on the suffix being ignored.
- [x] Invalidate/Update Epic: [[EPIC-008]] (readiness gate engine) gains this behaviour; no re-approval needed.
- [x] Database schema impacts? No.
- [x] [[CR-101]] (Draft) starts failing `existing-surfaces-verified` on `cleargate-planning/.claude/hooks/token-ledger.sh:612`. Fix that citation when this lands.
- [x] [[BUG-064]] (Draft, unscheduled) edits the same `PATH_RE` / suffix-strip code. CR-125 lands first unless BUG-064 is already merged; BUG-064 then rebases onto it.
- [x] [[CR-038]]'s preflight Step 0 is unchanged; it now reports stale symbols and lines too.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:evalExistingSurfacesVerified` — the predicate; `PATH_RE` and the suffix strip live in it.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:isPlannedDeliverable` — the forward-reference rule, which the new check respects.
- **Surface:** `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — existing tests for the predicate.
- **Why this CR extends rather than rebuilds:** `PATH_RE` already captures the suffix and the predicate already reads each cited file's path. The change keeps the suffix instead of dropping it and adds one content check per citation. No new predicate, no new gate.

## Prior work

- [[CR-033]] — introduced `existing-surfaces-verified` (path existence only).
- [[CR-038]] — preflight Step 0 refreshes every sprint item's gate cache, so this check re-runs before each sprint without new wiring.
- [[CR-073]] — tightened the path regex; this CR keeps its shape.
- [[CR-118]] — forward references to planned deliverables; preserved.
- [[BUG-064]] — dot-directory paths mangled by the same regex; coordinate.
- [[BUG-071]] — sentinel/template mismatch in the same section; unaffected.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts`
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts`
- `cleargate-cli/scaffold/core/.cleargate/templates/epic.md`
- `cleargate-cli/scaffold/core/.cleargate/templates/story.md`
- `cleargate-cli/scaffold/core/.cleargate/templates/CR.md`
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md` (Predicate Vocabulary entry `**7. existing-surfaces-verified**`, line 47)
- `.cleargate/delivery/pending-sync/CR-101_Dashboard_Auto_Update_Daemon.md` (fix the one stale citation)

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npx tsx --test test/lib/readiness-predicates.node.test.ts && npm run typecheck`

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Plain path, `:symbol` and `:NN` citations each pass when they resolve. |
| Interfaces | F | One surface: the predicate, reached through `gate check`. |
| Data | T | Citation shapes vary; a Scenario Outline covers them. |
| Rules | T | Forward references skip the suffix check. |

```gherkin
Feature: existing-surfaces-verified checks cited symbols

  @data
  Scenario Outline: The suffix of a citation is checked
    Given an epic whose ## Existing Surfaces cites "<citation>"
    And the cited file exists with <lines> lines and contains the word "evalPriorWorkRecorded"
    When existing-surfaces-verified is evaluated
    Then the result is <result>

    Examples:
      | citation                                                     | lines | result |
      | cleargate-cli/src/lib/readiness-predicates.ts                | 1200  | pass   |
      | cleargate-cli/src/lib/readiness-predicates.ts:evalPriorWorkRecorded | 1200 | pass |
      | cleargate-cli/src/lib/readiness-predicates.ts:noSuchFunction | 1200  | fail   |
      | cleargate-cli/src/lib/readiness-predicates.ts:950            | 1200  | pass   |
      | cleargate-cli/src/lib/readiness-predicates.ts:5000           | 1200  | fail   |

  @rules
  Scenario: A forward reference skips the suffix check
    Given a cited path that does not exist but is declared as a planned deliverable in a pending-sync item
    When existing-surfaces-verified is evaluated with a ":newSymbol" suffix on it
    Then it passes as a forward reference

  @paths
  Scenario: Obsolete logic is gone — a renamed symbol no longer passes
    Given an epic citing an existing file with a symbol that no longer appears in it
    When existing-surfaces-verified is evaluated
    Then it fails with "cited symbol not found" naming the citation

  @paths
  Scenario: Templates suggest checkable citations
    Given the canonical epic, story and CR templates
    When their ## Existing Surfaces placeholder is read
    Then it shows path/to/file.ext:symbolName and the sentence on markdown files
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Five Outline rows, the forward-reference scenario, the obsolete-logic scenario and the template scenario. |
| Integration tests | 0 | No database or Redis involved; fixtures are temp files. |
| E2E / acceptance tests | 0 | Preflight Step 0 already exercises the predicate end to end; no new wiring to test. |

---

## Context Source

**context_source:** Owner direction 2026-10-28 (suggestion 5 of the EGM comparison), narrowed by the measurement recorded in frontmatter; code read at `cleargate-cli/src/lib/readiness-predicates.ts:895-1004` and CR-038's archived spec.

## Independent review

- general-purpose: 4 findings — 2 fixed, 1 contested, 1 escalated, 0 declined
  - contested: "entry 7" was cited without checking it is this predicate — evidence: `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md:47` reads `**7. existing-surfaces-verified**`; the owner upheld the contest 2026-10-28
  - escalated: whether the CR is worth doing at 1 catch in 145 citations — §0.5 Q3, answered by the owner 2026-10-28

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(Accepted by the owner 2026-10-28: all are identified in §2; none was reverted because none depends on the old behaviour, and CR-101 needs a one-line citation fix, not a gate reset.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
