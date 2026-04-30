---
cr_id: CR-015
parent_ref: SPRINT-001
status: Completed
severity: P2-Medium
reporter: sandrinio
sprint: SPRINT-15
milestone: TBD
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-27T12:54:52Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by SPRINT-001 Reporter §5 Skills rating Red:
  "FLASHCARD.md empty post-sprint. Five concrete lessons should have been
  written *during* the sprint, not reconstructed at close." The Hakathon
  sprint surfaced 5 high-quality lessons (IntersectionObserver init order,
  JS-budget hoisting, nginx-alpine localhost DNS, image-size budget realism,
  ledger attribution audit) — none filed as flashcards in real time.
stamp_error: no ledger rows for work_item_id CR-015
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T12:54:52Z
  sessions: []
---

# CR-015: Bake flashcard discipline into Developer + QA agent role contracts

## 1. Why

The flashcard protocol in `.claude/skills/flashcard/SKILL.md` says:
> "After a surprise: append one line. Format `YYYY-MM-DD · #tag1 #tag2 · lesson ≤120 chars`."

In practice agents skip this — Reporter has to reconstruct lessons at sprint
end. By then context is fading, the lessons are vaguer, and they often miss
the specific commit / file path that would make them grep-useful.

The fix is upstream: make filing a flashcard a **mandatory exit step** for
Developer + QA when specific events occur. No new tooling, just role-contract
changes.

## 2. Trigger Events (mandatory flashcard write)

Developer agent:
- Story bounced by QA (post-bounce-fix commit).
- Architect plan deviated (CR:approach-change or CR:spec-clarification).
- Circuit-breaker fired (token exhaustion, etc.).

QA agent:
- Bounce kicked back (the kickback itself is a future-relevant lesson).
- Deviation accepted (the rationale is reusable).

## 3. Required Format

One line, appended to `.cleargate/FLASHCARD.md`, before the agent's final
exit message:

```
YYYY-MM-DD · #tag #tag · STORY-NNN-NN — <one-line lesson, ≤120 chars>
```

The line MUST cite the story id so future grep can find it.

## 4. Execution Sandbox

- `cleargate-planning/.claude/agents/developer.md` — add §X "Exit Discipline":
  enumerate the 3 trigger events; require flashcard line BEFORE final commit
  message; treat skip as a protocol violation.
- `cleargate-planning/.claude/agents/qa.md` — same for QA's 2 trigger events.
- Mirror updates in `.claude/agents/{developer,qa}.md` (live dev mirrors).
- Optional: SubagentStop hook can `wc -l .cleargate/FLASHCARD.md` and warn
  (advisory only) if no line was added on a story that had bounces. Defer to
  v2 of this CR.

## 5. Acceptance

- [ ] Developer + QA agent files updated with explicit Exit Discipline section.
- [ ] Live mirrors byte-equal.
- [ ] Manual smoke: spawn a developer agent with a fake "QA bounce" scenario,
      verify it appends a flashcard line before exiting.
- [ ] No code changes outside the two role files (+ mirrors).
- [ ] `cleargate@0.9.0` ships alongside BUG-021/BUG-022 (single shared release).

## 6. Out of Scope

- Hook enforcement (defer; advisory-only is enough for v1).
- Architect / Reporter role changes (those agents already produce per-sprint
  artifacts; not the locus of mid-sprint lesson loss).
- Retroactively filing the 5 SPRINT-001 lessons (those are listed in
  `.cleargate/sprint-runs/SPRINT-001/REPORT.md` §4 already; the user can copy
  them into the master FLASHCARD.md when ready).
