---
cr_id: CR-073
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: SPRINT-30
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: cli/readiness-gates
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T14:51:23Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Discovered 2026-05-19 while activating SPRINT-30 in the meta-repo.
  Six of seven SPRINT-30 items hit the existing-surfaces-verified gate
  with parser-induced false positives:

    - "state.execu" — extracted from the inline code reference
      "state.execution_mode" (parser caps extension at 5 chars; matched
      the first 5 letters of "execution_mode").
    - "Template.md" — extracted from the path
      ".cleargate/templates/Sprint Plan Template.md" because the parser
      doesn't tolerate spaces in path bodies, so it truncated the path
      at the last space.
    - ".gitig" — extracted from ".gitignore"; the 9-char "gitignore"
      exceeds the 5-char extension cap, so the parser matched
      "gitignore" greedily to 5 chars and called the truncated path
      ".gitig" the surface.
    - "init.ts" / "init.node.test.ts" / "upgrade.ts" — bare filenames
      mentioned in prose descriptions matched as standalone paths
      relative to projectRoot, where they don't exist.

  Each false positive forced a rewrite of §Existing Surfaces to avoid
  the offending construct. That's friction at every CR-drafting step —
  the gate fires on natural-language descriptions of citations, not
  just citations themselves.

  The current regex lives at cleargate-cli/src/lib/readiness-predicates.ts
  (function evalExistingSurfacesVerified):

      const PATH_RE = /[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g;

  The regex assumes every dotted token is a path. Reality: dotted
  tokens inside markdown prose include code references
  (state.execution_mode), variable names (req.body.user), URLs, etc.
  All of those get treated as path claims that the file system must
  satisfy.

  Reproduction: any CR whose §Existing Surfaces section paraphrases
  what's being changed. Pre-CR-073, the workaround was "scrub all
  inline dotted tokens from §Existing Surfaces." That's not a contract
  authors should have to internalize.

  This CR tightens the parser to reduce false positives while keeping
  the gate's intent — verifying that path citations point to real files.
stamp_error: no ledger rows for work_item_id CR-073
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:51:23Z
  sessions: []
---

# CR-073: Tighten readiness gate path-extractor regex to eliminate false-positive matches in §Existing Surfaces

## 0.5 Open Questions

- **Question:** Which approach is preferred — (a) tighten the regex to require an explicit leading directory marker (e.g., must contain `/`), (b) introduce a structured-citation syntax (e.g., backticks with required slash, or a dedicated `path: foo/bar.ts` line format), or (c) keep the regex permissive but add a deny-list of common code-reference patterns?
- **Recommended:** (a) Require at least one `/` in the path body before the extension. This eliminates ~95% of false positives (bare filenames, code references, single-word filenames) while preserving the legitimate citation pattern (relative paths always have at least one slash). One-line regex change. Backwards compatible: existing CRs that cite full paths still pass.
- **Human decision:** _populated during Brief review_

- **Question:** Should the §Existing Surfaces section also support a structured citation marker like `[surface]: path/to/file.ts` that the parser recognizes preferentially, falling back to regex extraction for backwards compat?
- **Recommended:** Defer to a follow-up CR. The slash-required tightening is the smallest viable fix that solves the friction observed here. Structured markers are a larger UX change with their own tradeoffs (more verbose, requires author training).
- **Human decision:** _populated during Brief review_

- **Question:** Do bare paths like `CLAUDE.md` (root-level files) still need to be supported, or is requiring a `/` strict-enough that root files must be referenced as `./CLAUDE.md`?
- **Recommended:** Require `./` for root files. The cost (a 2-char prefix) is much lower than the false-positive cost we're paying today. Document in the template's prose guidance.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Current regex at cleargate-cli/src/lib/readiness-predicates.ts inside evalExistingSurfacesVerified:

  ```
  const PATH_RE = /[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g;
  ```

  Matches any dotted token. False positives on inline code, code references, partial dotfile names, bare filenames in prose.

**New Logic (The New Truth):**

- Tightened regex requires at least one `/` in the path body before the final `.ext`:

  ```
  const PATH_RE = /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]*\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g;
  ```

  Effects:
  - Eliminates bare-filename false positives (init.ts in prose).
  - Eliminates code-reference false positives (state.execution_mode).
  - Eliminates partial-dotfile false positives (.gitig from .gitignore — the path before the dotfile name is now required).
  - Root-level files now need `./` prefix to match — small cost, documented in template guidance.
- Update the §Existing Surfaces template guidance to reflect the new rule: "paths must include at least one directory separator; for root-level files use `./CLAUDE.md` style."

## 2. Blast Radius & Invalidation

- [ ] **Invalidate/Update Story:** none in flight.
- [ ] **Invalidate/Update Epic:** EPIC-021 (Solo Onboarding DX) — parent link.
- [ ] **Database schema impacts?** No.
- [ ] **CR-template guidance update:** the template at .cleargate/templates/CR.md and the parallel story.md gain a one-line note in the §Existing Surfaces preamble explaining the slash-required rule.
- [ ] **Existing CRs in archive:** unaffected — their §Existing Surfaces already passed under the old (more permissive) regex; the new (tighter) regex is a superset relaxation in failure terms (anything that passed before still passes, except for the rare case of bare filenames at root, which is exactly what we want to reject).
- [ ] **User-visible behavior change:** Yes — CR authors see a more predictable parser. Fewer false positives.

## Existing Surfaces

- **Surface:** cleargate-cli/src/lib/readiness-predicates.ts — the existing PATH_RE regex inside evalExistingSurfacesVerified. CR-073 tightens it in place.
- **Surface:** cleargate-cli/test/lib/readiness-predicates.node.test.ts — gains new cases for the slash-required rule (bare filename → no match, code reference → no match, partial dotfile → no match, valid path with directory → match).
- **Why this CR extends rather than rebuilds:** One-line regex change + matching test fixtures. The gate's mechanism, evaluator, and result-caching all stay the same.

## 3. Execution Sandbox

**Modify:**

- cleargate-cli/src/lib/readiness-predicates.ts — tighten PATH_RE inside evalExistingSurfacesVerified per §1 New Logic.
- cleargate-cli/test/lib/readiness-predicates.node.test.ts (file path verified — predicate test file lives there) — add cases for the false-positive scenarios that motivated this CR.
- .cleargate/templates/CR.md — add one-line guidance under the §2.5 / §Existing Surfaces template heading: "cite paths with at least one `/` separator; root-level files use `./name.ext`."

**Do NOT touch:** the evaluator's evalExistingSurfacesVerified logic past the regex line. Sandbox check + existence check stay as-is.

## 4. Verification Protocol

**Test 1 — slash-required regex rejects bare filenames:**
- Input: "the init.ts file does foo"
- Expected: zero path matches.

**Test 2 — slash-required regex rejects code references:**
- Input: "the branch on state.execution_mode is collapsed"
- Expected: zero path matches.

**Test 3 — slash-required regex rejects partial dotfile false positives:**
- Input: ".gitignore needs expansion"
- Expected: zero path matches.

**Test 4 — slash-required regex accepts valid paths:**
- Input: "Surface: cleargate-cli/src/commands/init.ts — the init command body"
- Expected: one match, "cleargate-cli/src/commands/init.ts".

**Test 5 — slash-required regex accepts root files with `./` prefix:**
- Input: "Surface: ./CLAUDE.md — bounded block"
- Expected: one match, "./CLAUDE.md".

**Command:** `cd cleargate-cli && npm test -- --grep "PATH_RE"`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — root cause localized, fix is one regex change with matching tests.

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream items identified.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §Existing Surfaces cites at least one source-tree path the CR extends.
