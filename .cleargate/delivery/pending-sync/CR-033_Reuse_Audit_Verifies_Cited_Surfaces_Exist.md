---
cr_id: CR-033
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-03T20:00:00Z
approved_by: sandrinio
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Live evidence 2026-05-03 — markdown_file_renderer end-to-end install test.

  CR-028 (recently approved + ingested into SPRINT-20) shipped two new readiness
  criteria for the Code-Truth principle: `reuse-audit-recorded` and
  `simplest-form-justified`. CR-028 §0.5 Q3 explicitly chose the LOOSE form for
  `reuse-audit-recorded` (`body contains '## Existing Surfaces'`) with the
  explicit deferral plan: "Tighten in a follow-up CR after measurement."

  The follow-up failure mode arrived sooner than expected. After being
  challenged on its self-cert, the agent in the test folder admitted (verbatim,
  pasted by user 2026-05-03):
    "EPIC-002 §3.5 Existing Surfaces falsely claims present-tense surfaces that
    don't exist in the present-tense source tree — false claim of existence."

  The `reuse-audit-recorded` predicate today checks only that the section
  HEADING exists (`body contains '## Existing Surfaces'`). It cannot detect
  that the section's CONTENT is fabricated. The agent satisfied the predicate
  while violating the principle the predicate was designed to enforce. This is
  exactly the L0 (Code is Source of Truth) violation that CR-028's principle
  stack named.

  This CR is the "tighten after measurement" deferred from CR-028 §0.5 Q3.
  Measurement happened (in the test); time to tighten.

  Also relates to CR-028 §0.5 Q4 follow-up: a capability index would make this
  check cheap. But verifying the cited paths exist is feasible WITHOUT the
  index, just by parsing `## Existing Surfaces` for `path/to/file.ts:symbol`
  patterns and checking each path with fs.existsSync. The capability index
  becomes the cheap-and-fast version of the same check; this CR ships the
  slow-and-honest version first.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:50Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-033
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T16:21:30Z
  sessions: []
---

# CR-033: Tighten `reuse-audit-recorded` — Verify Cited Surfaces Exist on Disk

## 0.5 Open Questions

- **Question:** Citation format — strict (require `path:symbol` or `path:line` syntax) or permissive (extract any path-shaped substring from the section)?
  - **Recommended:** **permissive**. Extract candidates with the regex `[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(:[a-zA-Z_][a-zA-Z0-9_]*)?` (matches `src/foo.ts`, `src/foo.ts:fetchIssues`, `cleargate-cli/src/lib/work-item-type.ts`, `package.json`, etc.). Strict format would force agents to learn yet another micro-syntax; permissive matches what humans naturally write. False negatives (a path-like string that isn't actually a path) are caught by the existence check itself — `fs.existsSync` returns false, criterion fails, agent corrects.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Section parsing — only `## Existing Surfaces`, or also accept `### Existing Surfaces` and other heading levels?
  - **Recommended:** `## Existing Surfaces` only (matching CR-028's predicate exactly). Heading-level drift is a separate template-discipline issue.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Empty section handling — fail with "section present but cites zero surfaces" or pass on the basis that "no overlap found" is a valid audit result?
  - **Recommended:** **fail** if the section contains zero path-shaped substrings AND zero "no overlap found" / "no existing surface" sentinel phrases. The agent must either cite paths or explicitly assert the audit returned empty. Splitting "section heading-only" from "audit-with-result" is the whole point.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Glob support — handle `src/integrations/jira-*.ts` patterns?
  - **Recommended:** v1 = literal paths only. Glob support deferred. Agents writing patterns instead of literal paths is a smell ("I think there's stuff in here but didn't actually look").
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** New predicate shape (#7) or extend existing `body contains` semantics?
  - **Recommended:** new closed-set predicate shape: `existing-surfaces-verified`. Predicate engine gains one new shape. Keeps the `body contains '## Existing Surfaces'` check separate (presence) from the new check (correctness). CR-028's existing predicate stays as-is; this CR adds a sibling.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Sprint inclusion?
  - **Recommended:** off-sprint OR SPRINT-21 candidate. Lower urgency than CR-030/031/032 (which fix the test's blocking failures). This is the principle-tightening that follows once the basics work.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W3 Developer dispatch 7.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `.cleargate/knowledge/readiness-gates.md` `reuse-audit-recorded` criterion uses predicate `body contains '## Existing Surfaces'`. Checks only the section header. Content is unverified.
- The implicit assumption (codified in CR-028's deferral) that "loose form first; tighten after measurement" was the right phasing. Measurement returned a failure within hours. The principle CR-028 named (L0 Code-Truth) is being violated by the agent under the predicate it was designed to enforce.

**New Logic (The New Truth):**

A new criterion `existing-surfaces-verified` runs alongside (not instead of) `reuse-audit-recorded`. The presence check stays cheap and broad; the verification check enforces the principle.

**Predicate (new closed-set shape #7).**

```
existing-surfaces-verified
```

Implementation steps:

1. Locate the `## Existing Surfaces` section in the body. If absent → `reuse-audit-recorded` already failing; this criterion auto-skips with `not-applicable`.
2. Extract path-shaped substrings using regex `[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(:[a-zA-Z_][a-zA-Z0-9_]*)?`. Strip `:symbol` suffix.
3. For each unique extracted path:
   - Resolve relative to project root.
   - Sandbox check: `path.resolve(projectRoot, p).startsWith(projectRoot)`.
   - `fs.existsSync(path)` — record pass/fail.
4. If the section contains zero path matches:
   - Search for sentinel phrases: `no overlap found`, `no existing surface`, `no prior implementation`, `audit returned empty`. Match case-insensitive.
   - If a sentinel is present → criterion passes (the agent explicitly asserted empty).
   - If no sentinel → criterion fails with detail `'## Existing Surfaces' has no path citations and no "no overlap found" sentinel`.
5. If any extracted path fails `fs.existsSync` → criterion fails. Detail names each missing path: `cited path does not exist on disk: src/integrations/jira.ts`.

**Gate-definition update.** Add `existing-surfaces-verified` to all enforcing gates that already have `reuse-audit-recorded` (epic.ready-for-decomposition, story.ready-for-execution, cr.ready-to-apply). Bug exempt (per CR-028 §0.5 Q2 precedent — Bugs target existing behavior, audit incoherent).

## 2. Blast Radius & Invalidation

- [x] **Pre-existing items with `## Existing Surfaces` sections.** Will be re-evaluated on next gate check. Items that cite real paths → unchanged. Items that cite non-existent paths (e.g. EPIC-002 in the test folder) → start failing. Intended signal.
- [x] **Pre-existing items WITHOUT `## Existing Surfaces`** — already failing `reuse-audit-recorded`; this CR doesn't change their status.
- [x] **Update Epic:** EPIC-008 (predicate engine extension).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local predicate work.
- [ ] **Audit log:** No new fields. Failure detail strings are richer.
- [ ] **Coupling with CR-028:** CR-028 shipped the principle + the loose predicate. This CR ships the strict predicate. CR-028's `reuse-audit-recorded` stays as-is (presence check); this CR adds the sibling (verification check). No conflict; orthogonal layers.
- [ ] **Coupling with capability index follow-up (CR-029-suggested per CR-028 §0.5 Q4):** the index, when it ships, makes this check faster but does not replace it. This CR's predicate uses fs.existsSync directly; index version uses the parsed-symbol cache. Same semantic.
- [ ] **FLASHCARD impact:** add card on completion — *"`existing-surfaces-verified` predicate parses `## Existing Surfaces` for path-shaped strings, asserts each exists on disk OR section carries 'no overlap found' sentinel. Catches the L0 Code-Truth violation that loose `reuse-audit-recorded` misses."*
- [ ] **Scaffold mirror:** `readiness-gates.md` + `readiness-predicates.ts` mirrors stay byte-equal.
- [ ] **Initiative exclusion.** Initiatives don't have a `## Existing Surfaces` section in their template (they're stakeholder-authored intent, not implementation plan). The Initiative gate added by CR-030 must NOT include `existing-surfaces-verified`.

## 3. Execution Sandbox

**Modify (predicate engine — 1 file):**

- `cleargate-cli/src/lib/readiness-predicates.ts` — add new predicate evaluator for `existing-surfaces-verified`. ~50-80 lines: section locator + path regex + sentinel matcher + per-path existence check.

**Modify (readiness gates — 1 file + 1 mirror):**

- `.cleargate/knowledge/readiness-gates.md` — add `existing-surfaces-verified` to:
  - `epic.ready-for-decomposition`
  - `story.ready-for-execution`
  - `cr.ready-to-apply`
  Add a brief paragraph in the **Predicate Vocabulary** section documenting the new shape #7.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror.

**Tests (2 files):**

- `cleargate-cli/test/lib/readiness-predicates.test.ts` — add scenarios:
  1. Section absent → `not-applicable`.
  2. Section present, cites `src/foo.ts` (exists) → pass.
  3. Section present, cites `src/foo.ts:fetchIssues` (exists) → pass; symbol suffix stripped before existence check.
  4. Section present, cites `src/missing.ts` (does not exist) → fail; detail names path.
  5. Section present, cites mix of real + missing → fail; detail names only the missing.
  6. Section present, no path matches, contains "no overlap found" sentinel → pass.
  7. Section present, no path matches, no sentinel → fail with sentinel-missing detail.
  8. Section present, cites `../../etc/passwd` → sandbox-rejected, treated as missing → fail.
  9. Section present, cites `package.json` (top-level real file) → pass.
- Fixture markdown files under `cleargate-cli/test/fixtures/existing-surfaces/`.

**Out of scope:**

- Capability index (`wiki/capabilities/`) — separate CR (CR-029-suggested per CR-028).
- Glob support — deferred per §0.5 Q4.
- Symbol-level verification (does `fetchIssues` actually exist as an export of `src/foo.ts`?) — deferred. Existence-of-file is the v1 floor. Symbol-level is the next tightening once capability index lands.
- Auto-extracting `Existing Surfaces` sections from older work items where the section is named differently (`Reused From`, `Built On`, etc.) — no normalization. Templates dictate one heading.

## 4. Verification Protocol

**Acceptance:**

1. **Bug reproduces pre-CR.** EPIC-002 in the test folder cites surfaces that don't exist (per agent's own admission). `cleargate gate check EPIC-002.md` today: `reuse-audit-recorded` PASSES (heading present). Post-CR: `reuse-audit-recorded` still passes; `existing-surfaces-verified` fails with detail naming each non-existent path.
2. **Honest empty audit passes.** Author a fixture Epic with `## Existing Surfaces\n\nNo overlap found — grepped: jira, integration, sync.` Run gate check. Both criteria pass.
3. **Cited real path passes.** Author fixture Epic citing `cleargate-cli/src/lib/work-item-type.ts:detectWorkItemTypeFromFm`. Both criteria pass.
4. **Cited missing path fails.** Author fixture Epic citing `cleargate-cli/src/lib/does-not-exist.ts`. `existing-surfaces-verified` fails; detail names the path.
5. **Mixed pass/fail.** Cite one real + one missing. Criterion fails; detail names only missing.
6. **Sandbox.** Cite `../../etc/passwd`. Criterion fails (sandbox-rejected → treated as missing).
7. **Initiative exempt.** Run gate check on a fixture Initiative (CR-030 lands first). `existing-surfaces-verified` is not in the criteria list.
8. **End-to-end.** After CR-030 + CR-031 + CR-032 + CR-033 land, re-run the markdown_file_renderer test. The Epic that fabricated surfaces fails this criterion in chat (CR-032 surfaces it), agent corrects.

**Test commands:**

- `cd cleargate-cli && npm test -- readiness-predicates` — focused.
- Manual smoke: gate check the test folder's EPIC-002 if it survives CR-030/031.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-033): existing-surfaces-verified predicate enforces L0 code-truth on Existing Surfaces section`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (loose `reuse-audit-recorded` predicate; L0 violation in the wild).
- [x] All impacted downstream items identified (pre-existing items with fabricated surfaces start failing; intended signal).
- [x] Execution Sandbox names exact files + per-path test scenarios (9 cases).
- [x] Verification protocol with reproducer + 8 acceptance scenarios.
- [ ] **Open question:** Citation format — strict vs permissive (§0.5 Q1).
- [ ] **Open question:** Section heading level — `##` only or also `###` (§0.5 Q2).
- [ ] **Open question:** Empty section handling — fail vs pass with sentinel (§0.5 Q3).
- [ ] **Open question:** Glob support v1 vs deferred (§0.5 Q4).
- [ ] **Open question:** New predicate shape #7 vs extend existing (§0.5 Q5).
- [x] ~~**Open question:** Sprint inclusion — off-sprint, SPRINT-20, or SPRINT-21 (§0.5 Q6).~~ Resolved 2026-05-03: SPRINT-21 (W3).
- [ ] `approved: true` is set in the YAML frontmatter.
