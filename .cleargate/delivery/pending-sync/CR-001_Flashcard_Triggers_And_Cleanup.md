---
cr_id: CR-001
parent_ref: META (bootstrap — flashcard skill + reporter agent, pre-sprint)
status: Draft
approved: "true"
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: "null"
input: "null"
output: "null"
cache_read: "null"
cache_creation: "null"
model: "null"
sessions: []
cached_gate_result: {pass: true, failing_criteria: [], last_gate_check: "2026-04-19T18:23:31Z"}
pass: "null"
failing_criteria: []
last_gate_check: "null"
stamp_error: no ledger rows for work_item_id CR-001
draft_tokens: {"input":null,"output":null,"cache_creation":null,"cache_read":null,"model":null,"last_stamp":"2026-04-19T18:23:31Z","sessions":[]}
---

# CR-001: Flashcard — Broader Triggers & Cleanup Audit

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Flashcards only captured *surprises*. Winning recipes and user corrections had no home.
- Rule 6 — "Never delete" — was interpreted as "cards accumulate forever with no hygiene". In practice the log drifts: stale cards (referenced code gone) and resolved cards (gotcha fixed) still surface in `check` mode, diluting the signal.
- Reporter agent did not audit flashcards against repo state.

**New Logic (The New Truth):**
- Flashcards capture three trigger classes: **surprise** (existing), **recipe** (a non-trivial winning path worth preserving), **correction** (a user pushback worth remembering). Same file, same 120-char cap, same tags — new trigger phrases in the skill description nudge the drafter. No new parsing syntax.
- Cards can carry a **status marker** after the second `·`:
  - no marker → active (default).
  - `[S]` → stale (referenced symbol no longer exists in the repo).
  - `[R] → superseded-by <ref>` → resolved / replaced by a later card or a shipped fix.
  - "Never delete" still holds — markers are additive; history is preserved.
- `check` mode skips `[S]` and `[R]` cards by default; full history is reachable via explicit grep or the supersede chain.
- **Reporter agent runs a flashcard audit** once per sprint as part of `REPORT.md`. For each unmarked card, it greps the lesson body for concrete symbols (file paths, identifiers, CLI flags). Cards whose referenced symbols are all missing from the repo are flagged as `[S]` candidates in a new report section. Human approves the batch; the marker is then applied.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — flashcard skill + reporter were bootstrapped, not delivered via stories.
- [ ] Invalidate/Update Epic: none.
- [ ] Database schema impacts: No — markdown-only.
- [ ] Downstream agent contracts affected: reporter.md gains an audit step; no other agent changes.
- [ ] Scaffold mirror required: yes — `cleargate-planning/.claude/skills/flashcard/SKILL.md` and `cleargate-planning/.claude/agents/reporter.md` must match live dogfood copies.

## 3. Execution Sandbox

**Modify:**
- `.claude/skills/flashcard/SKILL.md` — expand triggers + add Rules 7 & 8.
- `cleargate-planning/.claude/skills/flashcard/SKILL.md` — mirror.
- `.claude/agents/reporter.md` — add audit step to workflow + new report section.
- `cleargate-planning/.claude/agents/reporter.md` — mirror.
- `.cleargate/FLASHCARD.md` — update header one-liner hint about the status-marker filter.

## 4. Verification Protocol

- `diff -q .claude/skills/flashcard/SKILL.md cleargate-planning/.claude/skills/flashcard/SKILL.md` → empty.
- `diff -q .claude/agents/reporter.md cleargate-planning/.claude/agents/reporter.md` → empty.
- FLASHCARD.md parses under existing format (dated line, tags, body).
- Manual check: invoking `Skill(flashcard, "check")` in a future session respects the marker filter — `[S]` / `[R]` lines are omitted unless explicitly requested.
- Next sprint's reporter produces a "Flashcard audit" section with ≥0 candidates and cites evidence per candidate.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green:
- [x] Obsolete logic explicitly declared (§1).
- [x] Blast radius identified (§2) — no downstream items to invalidate.
- [x] Execution sandbox contains exact file paths (§3).
- [x] Verification commands provided (§4).
- [x] `approved: true` set in frontmatter (user verbally approved both parts of the CR in the preceding conversation).
