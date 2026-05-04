---
cr_id: CR-058
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-25
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  README.md and cleargate-cli/README.md predate the SDLC Hardening
  arc (SPRINT-22, SPRINT-23, SPRINT-24). Eight major capabilities
  shipped during that arc are absent from the docs:

  Sprint 22 (TDD discipline + DevOps role):
    - CR-042 Reporter prompt accuracy fix
    - CR-043 TDD Red/Green discipline (*.red.node.test.ts immutable)
    - CR-044 DevOps role agent (5th agent in the loop)

  Sprint 23 (cross-cutting tooling):
    - CR-045 Sprint Context File
    - CR-046 run_script.sh structured incident wrapper
    - CR-047 Mid-Sprint Triage Rubric + Test Pattern Validation gate
    - CR-048 Cross-sprint orphan reconciler hardening

  Sprint 24 (carry-over cleanup):
    - CR-049 Canonical-vs-live parity CI guard
    - CR-050 run_script.sh shim retirement (8 callers migrated)
    - CR-051 DevOps subagent registration findings + escape hatch
    - CR-052 wrapScript shared test helper

  Most critically, README §3 still describes a "four-agent loop
  (Architect → Developer → QA → Reporter)". Reality: 5-role 7-step
  loop (Architect SDR + M1 → QA-Red → TPV → Developer → QA-Verify
  → Architect post-flight → DevOps → Reporter at sprint close).

  CR-058 brings README + cleargate-cli/README current, ships a
  lifecycle-diagram-prompt.md that the user feeds to an external
  image generator (per user direction: "do not draw diagram"), and
  marks the SDLC Hardening arc complete in the scratch roadmap doc.

  Out-of-scope hand-offs:
  - Lifecycle SVG redraw (post-sprint, user-driven via image generator)
  - INTERNALS.md update (verify exists; if substantively stale, file as separate CR-059)
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T19:03:20Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-058
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:58:26Z
  sessions: []
---

# CR-058: README Refresh + Lifecycle Diagram Prompt

## 0.5 Open Questions

- **Question:** "Four-agent loop" branding — keep "four" with "+ DevOps" footnote, OR rebrand?
  - **Recommended:** REBRAND to "five-role loop" or "agent team". The README's marketing copy says "four-agent loop" prominently; that's now factually wrong. Five roles: Architect, Developer, QA (with Red + Verify modes), DevOps, Reporter. Keep tagline punchy: "five-role agent team in a structured ship-loop". README §3 heading: "## The Five-Role Agent Loop".
  - **Human decision:** _populated during Brief review_

- **Question:** TPV — surface as 6th role OR as Architect mode?
  - **Recommended:** Architect mode (since TPV is the Architect agent dispatched in Mode: TPV, not a distinct agent file). README mentions Architect having 3 modes: SDR (sprint design review), M1 (milestone plan), TPV (test pattern validation), post-flight (architectural review). 4 modes total. Keep "five-role" framing; explain Architect's modes inline.
  - **Human decision:** _populated during Brief review_

- **Question:** MCP adapter claim — "Native adapters for Jira, Linear, GitHub Projects" still accurate?
  - **Recommended:** verify pre-edit. If shipped: keep as-is. If aspirational: soften to "MCP server with adapter framework; native Jira/Linear/GitHub Projects in development; see [INTERNALS.md] for adapter status". Dev confirms during investigation phase.
  - **Human decision:** _populated during Brief review_

- **Question:** Add a "What's new (SPRINT-22..SPRINT-24)" section?
  - **Recommended:** YES. ~30-line section after §How it works. Lists the 11 CR shipments at one-liner granularity. Helps returning readers see the framework's evolution; helps onboarding readers understand the current shape vs older blog/doc references.
  - **Human decision:** _populated during Brief review_

- **Question:** Lifecycle diagram prompt — markdown OR YAML structured?
  - **Recommended:** markdown with structured headings: `## Subject`, `## Style`, `## Layout`, `## Reference (boxes + arrows)`, `## Color palette`, `## Caption`. Easy for the user to copy + paste sections into Midjourney / DALL-E / etc. depending on which sections that tool accepts. ~80-120 lines. File location: `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` (lives with the sprint, not as an asset).
  - **Human decision:** _populated during Brief review_

- **Question:** SDLC scratch roadmap doc — update OR archive?
  - **Recommended:** UPDATE in place. `.cleargate/scratch/SDLC_hardening_continued.md` should mark SPRINT-22/23/24 as complete and SPRINT-25 as the wrap-up. Add a brief retro section: "SDLC Hardening arc closes here; framework now ergonomic; future sprints return to product direction (set at SPRINT-26 kickoff)."
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- README §3 "The Four-Agent Loop" (Architect → Developer → QA → Reporter).
- README §What `init` lays down agent list missing `devops`.
- README §Getting started step 6 "Run the Developer, QA, and Reporter agents for each Story in sequence" — wrong sequence; QA-Red runs FIRST, then TPV, then Dev, then QA-Verify, then Architect post-flight, then DevOps merge, then Reporter at sprint end.
- cleargate-cli/README missing `sprint preflight`, `gate check`, `doctor`, `state update/validate`, `story start/done`.
- `.cleargate/scratch/SDLC_hardening_continued.md` calls SPRINT-24 a "placeholder".

**New Logic (The New Truth):**
- README §3 "The Five-Role Agent Loop" with: Architect (4 modes: SDR, M1, TPV, post-flight), Developer, QA (2 modes: Red writes failing tests, Verify is read-only acceptance), DevOps (mechanical merge + state transitions), Reporter (sprint-close synthesis).
- 7-step per-story sequence documented: Architect M1 → QA-Red → TPV → Developer → QA-Verify → Architect post-flight → DevOps merge.
- 4 explicit gates documented: Gate 1 (Initiative), Gate 2 (Ambiguity), Gate 3 (`cleargate sprint preflight`), Gate 4 (`close_sprint.mjs --assume-ack`).
- New §What's New section recaps the SDLC Hardening arc (SPRINT-22..SPRINT-24).
- `.cleargate/scratch/SDLC_hardening_continued.md` marks SDLC arc complete.
- `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` ready for external image generator at Gate-4 close.

## 2. Blast Radius & Invalidation

- [ ] **`/README.md`** — major refresh:
  - Line 7 tagline: rebrand "four-agent loop" → "five-role agent team"
  - Line 56 §The problem table: same fix
  - §3 The Four-Agent Loop → §3 The Five-Role Agent Loop (full rewrite of role descriptions)
  - §5 Quality assurance: add Step 2.6b cross-sprint orphan reconciler reference
  - §6 MCP adapter: verify Jira/Linear/GitHub Projects claim; soften if aspirational
  - §7 Self-improving engine: add TPV catch rate; add Hotfix Audit semantics
  - §What `init` lays down: add `devops`, `cleargate-wiki-contradict`, `mid-sprint-triage-rubric.md`, `.cleargate/scripts/run_script.sh` mention
  - §Getting started: rewrite step-sequence to reflect 7-step loop + Gate 3 + Gate 4
  - NEW §What's new (SPRINT-22..SPRINT-24): ~30 lines summarizing the 11 CR shipments
  - Lifecycle diagram footnote: "Diagram refresh in flight — see SPRINT-25 lifecycle-diagram-prompt.md"
- [ ] **`/cleargate-cli/README.md`** — Commands section expansion:
  - Add `cleargate sprint preflight`, `cleargate sprint init/close`, `cleargate gate check`, `cleargate doctor`, `cleargate state update/validate`, `cleargate story start/done/bouncing`
- [ ] **`.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md`** — NEW. Image-generation prompt: subject (5-role 7-step loop), style (clean technical diagram, not whiteboard sketch), layout (linear flow with halt-points highlighted), color palette (aligned with `assets/github-banner.svg`), captions, ~80-120 lines.
- [ ] **`.cleargate/scratch/SDLC_hardening_continued.md`** — mark SPRINT-22/23/24 complete; add brief retro for SPRINT-25 wrap-up; remove SPRINT-24 "placeholder" framing.
- [ ] **No code change** — pure docs CR.

## Existing Surfaces

- **Surface:** `README.md` (202 lines) — root README; entry point for new users.
- **Surface:** `cleargate-cli/README.md` (53 lines) — npm package README.
- **Surface:** `assets/github-banner.svg` — referenced art (don't redraw; verify presence).
- **Surface:** `assets/lifecycle-diagram.svg` — referenced art (don't redraw; verify presence).
- **Surface:** `docs/INTERNALS.md` — referenced from §Want to know more (line 201). Verify exists; flag for separate CR if substantively stale.
- **Surface:** `.cleargate/scratch/SDLC_hardening_continued.md` — local strategy scratchpad.
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — Architect role spec (read-only reference for accurate prose).
- **Surface:** `cleargate-planning/.claude/agents/developer.md` — Developer role spec (read-only reference).
- **Surface:** `cleargate-planning/.claude/agents/devops.md` — DevOps role spec (read-only reference).
- **Surface:** `cleargate-planning/.claude/agents/qa.md` — QA role spec (read-only reference).
- **Surface:** `cleargate-planning/.claude/agents/reporter.md` — Reporter role spec (read-only reference).
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — actual loop spec (read-only reference).
- **Why this CR extends rather than rebuilds:** all docs exist; CR-058 updates content sections. No new files except the diagram prompt + sprint retro.

## 3. Execution Sandbox

**Modify:**
- `/README.md` (~150 lines of edits across multiple sections)
- `/cleargate-cli/README.md` (~20 lines added to Commands)
- `.cleargate/scratch/SDLC_hardening_continued.md` (~30 lines edited/added)

**Add:**
- `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` (~80-120 lines)

**Out of scope:**
- Lifecycle SVG redraw (user runs the prompt through an image generator post-sprint)
- INTERNALS.md substantive update (verify presence only; flag separate CR if stale)
- Wiki page edits (auto-rebuild via `cleargate wiki build` post-merge)
- Adapter implementations (Jira/Linear/GitHub Projects); verify claim only

## 4. Verification Protocol

**Acceptance:**
1. README §3 heading is "The Five-Role Agent Loop" (or equivalent rebranding); body describes 5 roles + Architect's 4 modes.
2. README §3 mentions all of: Sprint Design Review, Test Pattern Validation, DevOps merge step, post-flight architectural review.
3. README §What `init` lays down agent list includes `devops`.
4. README §Getting started step-sequence references the 7-step per-story loop AND Gate 3 (preflight) AND Gate 4 (close).
5. NEW §What's new section lists CRs 042-052 at one-liner granularity.
6. cleargate-cli/README.md Commands section adds: `sprint preflight`, `gate check`, `doctor`, `state update/validate`, `story start/done`.
7. NEW `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` exists; ≥80 lines; structured headings (`## Subject`, `## Style`, `## Layout`, `## Reference`, `## Color palette`, `## Caption`).
8. `.cleargate/scratch/SDLC_hardening_continued.md` marks SPRINT-24 as completed (not "placeholder"); adds SPRINT-25 wrap-up section.
9. **No broken references:** every file/agent/path mentioned in the new README copy must exist on disk. QA-Verify spot-check confirms via grep.
10. **Reporter Brief surfaces the diagram prompt at Gate 4** (per Open Q5 default).
11. `cd cleargate-cli && npm run typecheck && npm test` exits 0 (no code changes; baseline preserved).

**Test Commands:**
- (manual) Read README.md top-to-bottom; confirm prose flows.
- (manual) Read lifecycle-diagram-prompt.md; confirm parseable by an image generator.
- `grep -E "four-agent loop|Architect → Developer → QA → Reporter" README.md` → should return 0 matches post-CR.
- `ls .claude/agents/devops.md` → should exist (it does, post-CR-044).

**Pre-commit:** standard. No `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (6 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — multi-file docs refresh + new prompt file).
- [ ] Reporter Brief contract confirmed (surface diagram prompt at Gate 4).

---
