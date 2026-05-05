---
cr_id: CR-060
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_at: 2026-05-05T08:40:00Z
approved_by: sandrinio
created_at: 2026-05-05T08:00:00Z
updated_at: 2026-05-05T08:00:00Z
created_at_version: cleargate@0.11.3
updated_at_version: cleargate@0.11.3
context_source: |
  During the 2026-05-04 SPRINT-25 → 0.11.x dogfood test, the conversational
  agent (me) misread the "Dogfood split — canonical vs live" section of
  the root CLAUDE.md and told the user that target repos receive a 792K
  duplicate cleargate-planning/ directory. The user pushed back; rereading
  the source code (cleargate-cli/src/init/copy-payload.ts SKIP_FILES) and
  inspecting the actual target-repo state (markdown_file_renderer has no
  cleargate-planning/ directory) revealed: only `.claude/` and `.cleargate/`
  contents land at target root; the cleargate-planning/ wrapper itself is
  meta-repo-only. The CLAUDE.md text doesn't say otherwise but is easy to
  misread because the section bullets describe canonical / payload / live
  without an explicit "in target repos, only these files appear:" line.
  CR-060 is a one-paragraph clarification — pure doc, no behavior change.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:52:13Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-060
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T08:51:20Z
  sessions: []
---

# CR-060: Clarify in CLAUDE.md that cleargate-planning/ is meta-repo-only, not shipped to target repos

## 0.5 Open Questions

- **Question:** Should the clarification land in the root CLAUDE.md only, or also in cleargate-planning/CLAUDE.md (the bounded-block source)?
- **Recommended:** Root CLAUDE.md only. The bounded-block CLAUDE.md is what gets injected into target repos — it doesn't need to describe its own dogfood-split semantics. Root CLAUDE.md is the meta-repo doc.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The current "Dogfood split — canonical vs live" section in root CLAUDE.md describes three layers (canonical / NPM payload / live) without explicitly saying what target repos receive. Easy to misread as "all three land in every install."

**New Logic (The New Truth):**
- Add one paragraph (≤4 sentences) immediately after the existing 3-bullet enumeration, stating: in target repos, `cleargate init` copies only the *contents* of `.claude/` and `.cleargate/` from the payload — NOT the `cleargate-planning/` wrapper. The wrapper directory exists only in this meta-repo. Top-level `CLAUDE.md` is bounded-block-injected; top-level `MANIFEST.json` is skipped (per `cleargate-cli/src/init/copy-payload.ts:54` SKIP_FILES). The install snapshot lands at `.cleargate/.install-manifest.json`.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — pure doc CR.
- [ ] Invalidate/Update Epic: none — informational addition; no scope change.
- [ ] Database schema impacts? No.
- [ ] User-visible behavior change: No. Documentation-only.

## Existing Surfaces

- **Surface:** `CLAUDE.md` lines 19–35 — current "Dogfood split — canonical vs live" section. Three bullets describing canonical/payload/live, then a paragraph about manual re-sync.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:54` — the SKIP_FILES Set that's the actual source of truth (the two skipped entries are the top-level CLAUDE.md and the top-level manifest file from the payload — neither lands at target root).
- **Surface:** `cleargate-cli/src/commands/init.ts:391-408` — Step 7 that writes the install snapshot to `.cleargate/.install-manifest.json`.
- **Why this CR extends rather than rebuilds:** the existing text is correct; only one missing sentence prevents readers (including future-me) from inferring incorrect target-repo state. Surgical addition, no rewrite.

## 3. Execution Sandbox

**Modify:**
- `CLAUDE.md` — insert one paragraph after the three "canonical / NPM payload / live" bullets in the "Dogfood split" section.

**Do NOT touch:** `cleargate-planning/CLAUDE.md` (the bounded-block injected into targets). That doc serves a different audience.

## 4. Verification Protocol

**Test:** read CLAUDE.md after the edit. Look for:
- Explicit phrase: "target repos do not receive a `cleargate-planning/` directory" (or equivalent).
- Citation of `copy-payload.ts:54` SKIP_FILES.
- Mention of `.cleargate/.install-manifest.json` as the install-snapshot location.

No automated test — pure doc CR. The "verification" is human read-through.

**Command:** `grep -A3 'Dogfood split' CLAUDE.md` should return the new paragraph.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — open question on whether also touching cleargate-planning/CLAUDE.md.

Requirements to pass to Green (Ready to Apply):
- [x] Old vs. New logic explicitly defined.
- [x] Blast radius declared.
- [x] Existing surfaces cited with file:line.
- [x] Execution sandbox restricted.
- [x] Verification protocol with command provided.
- [ ] `approved: true` is set in the YAML frontmatter.
