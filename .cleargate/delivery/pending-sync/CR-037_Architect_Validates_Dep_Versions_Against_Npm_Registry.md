---
cr_id: CR-037
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: "SPRINT-21"
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
  Surfaced 2026-05-03 in markdown_file_renderer end-to-end install test.
  Test agent's sprint-close walkthrough self-report named this as one of
  five critical signals:

    "1. Architect should validate dep versions against npm registry before
        drafting specs. Story 001-01 hit Vite v8 (doesn't exist — current is
        v6) and Milkdown v2 (current is v7.20). Developer absorbed both
        deviations; one was a clean fix, but it's wasted dispatch tokens.
        Fix: Architect's pre-spec checklist gains a one-liner:
        npm view <pkg> versions --json | tail -1."

  Mechanics: Architect drafts per-milestone plans (.cleargate/sprint-runs/<id>/
  plans/M<N>.md) that name dep packages + versions. Today these versions are
  picked from the Architect's training-data memory of "what version was
  current when this model was trained." That memory drifts: Vite v8 doesn't
  exist (current v6); Milkdown v2 is two majors behind v7.20. Developer
  agents then either:
    (a) Notice the drift and patch silently (wasted dispatch tokens), or
    (b) Don't notice and ship the wrong version.

  The fix is a pre-spec validation step in the Architect agent prompt: for
  every dep named in §3 / §4 / §5 of a milestone plan, run
  `npm view <pkg> version` and either pin to that version or, if the
  Architect-chosen version is materially older, surface as an explicit
  decision ("using <X>, current is <Y>, reason: ...").

  Costs nothing per package (one HTTP GET, sub-second). Saves the entire
  Developer dispatch turn on every drift case. Same shape as the L0
  Code-Truth principle (CR-028): cache (training memory) ≠ truth (npm
  registry); on conflict, the registry wins.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-037
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:38Z
  sessions: []
---

# CR-037: Architect Pre-Spec Dep Version Check Against npm Registry

## 0.5 Open Questions

- **Question:** Validation scope — every dep named in any plan section, or only deps in the "scaffold" / "stack" portions?
  - **Recommended:** **every dep**. The cost (one `npm view <pkg> version`) is sub-second; the value (catching one drift saves a full Developer turn = millions of tokens) dominates. False-positive cost is near-zero — checking a real package returns its real version, no harm.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Behavior on drift — auto-pin to current, OR flag as explicit Architect decision in the plan?
  - **Recommended:** **flag as explicit decision**. Auto-pinning hides the drift; explicit flag forces the Architect to either justify the older pin (e.g., "v6 is the latest stable; v7-beta out 2025-12 with breaking API") or update to current. Format in plan §3:
    ```
    - vite ^6.0.0 (current per npm registry: 6.0.7 — pinning to ^6 minor range)
    ```
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Network access in Architect agent — already present, or new capability surface?
  - **Recommended:** **already present**. Architect has Bash tool access (per `.claude/agents/architect.md` tools field). `npm view <pkg> version` is a single shell command. No new capability needed; just a prompt instruction.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Sprint inclusion?
  - **Recommended:** SPRINT-21. Pair-of-opportunity with CR-036 (Reporter diet) — both are agent-prompt-only edits, low risk, ship together.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W1 batch dispatch (with BUG-026 + CR-031 + CR-035).

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The implicit assumption that the Architect's training-data memory of dep versions is current. Models have knowledge cutoffs; npm packages release continuously. By definition, every Architect dispatch operates on stale version knowledge.
- `.claude/agents/architect.md` doesn't currently include any pre-spec validation step against external sources. The Architect drafts → Developer absorbs the drift → ledger pays for it.

**New Logic (The New Truth):**

`.claude/agents/architect.md` gains a "**Pre-Spec Dep Version Check**" instruction in the milestone-plan drafting workflow:

> Before declaring any dependency package + version in §3 / §4 / §5 of a milestone plan, run `npm view <pkg> version` (single shell command via Bash tool) for each named package. Compare against the version you intended to write:
> - If your intended version is `<= current`, write it.
> - If your intended version is `> current` (the package version doesn't exist), use the current version.
> - If your intended version is materially older than current (e.g., a major behind), make it an explicit decision in the plan: `- <pkg> <intended> (current per npm registry: <current> — reason: <why pin older>)`.
>
> This is a hard rule. Spec'ing non-existent or stale versions wastes a full Developer dispatch.

Same pattern as the L0 Code-Truth principle (CR-028): training-data memory is a cache; npm registry is truth.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing milestone plans** — no backfill. Future plans get the check; old plans stay as-shipped.
- [x] **Update Epic:** EPIC-013 (execution phase v2 — Architect role contract).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local agent prompt edit.
- [ ] **Audit log:** No new fields.
- [ ] **Coupling with CR-036** (Reporter diet): both are agent-prompt-only edits. Pair in same merge for efficiency.
- [ ] **Performance:** N npm view calls per milestone plan where N = unique deps named (typically 5-15). Each call sub-second. Adds ~10s to Architect dispatch — negligible vs the wasted Developer turn it prevents.
- [ ] **FLASHCARD impact:** add card on completion — *"Architect runs `npm view <pkg> version` on every dep before spec; surfaces drift as explicit decision. L0 Code-Truth applied to package versions: training-data is cache, registry is truth."*
- [ ] **Scaffold mirror:** `.claude/agents/architect.md` + canonical mirror byte-equal post-edit.
- [ ] **Network dependency:** the Architect dispatch now requires npm registry reachability. Offline Architect dispatches fail or skip the check. Mitigation: skip-with-warning if `npm view` errors (record in plan: "version check skipped: <reason>").

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `.claude/agents/architect.md` — Architect agent definition; `tools:` field already grants `Bash` capability needed for `npm view`.
- **Surface:** `.cleargate/sprint-runs/<id>/plans/M<N>.md` — milestone plan format; this CR adds an "expected dep versions" rendering convention to the plan stencil.
- **Why this CR extends rather than rebuilds:** prompt-only edit; no new tool, no new code path.

## 3. Execution Sandbox

**Modify (Architect agent — 1 file + 1 mirror):**

- `.claude/agents/architect.md` — add a new section in the milestone-plan workflow guidance:

  ```markdown
  ## Pre-Spec Dep Version Check (CR-037)

  Before declaring any dep package + version in your milestone plan, run
  `npm view <pkg> version` for each. Three rules:

  1. Intended version ≤ current → write it.
  2. Intended version > current (doesn't exist) → use current. Note the
     correction inline: `- <pkg> ^<current> (corrected from intended <X>:
     does not exist on registry as of <date>)`.
  3. Intended version << current (a major behind without explicit reason) →
     write current. If you have a reason to pin older, write the decision:
     `- <pkg> ^<intended> (current: <current>; reason: <why pin>)`.

  Skip-with-warning permitted only if `npm view` errors (offline or
  registry down). Record in plan footer: `Version check skipped: <reason>`.
  ```

- `cleargate-planning/.claude/agents/architect.md` — byte-equal mirror.

**Tests:**

- No automated test (agent prompt edits are tested via end-to-end sprint dispatch). Manual smoke at acceptance.

**Out of scope:**

- Architect-time version PINNING enforcement (the check happens; pinning style is the Architect's call per §0.5 Q2).
- Other-registry validation (PyPI, Maven, etc.) — file as CR-040-suggested if cross-language sprints become common.
- Lockfile validation post-Developer-dispatch — separate concern; not Architect's surface.

## 4. Verification Protocol

**Acceptance:**

1. **Manual smoke — drift caught.** Author a fixture milestone plan that names `vite ^8.0.0` (doesn't exist). Dispatch Architect with the new prompt. Architect runs `npm view vite version`, observes current ≠ 8, corrects to current per rule 2.
2. **Manual smoke — current version unchanged.** Same plan with `react ^18.3.0` (currently exists). Architect writes as-is per rule 1.
3. **Manual smoke — explicit decision preserved.** Architect intends `tailwindcss ^3.4.0` knowing v4 exists. Plan output: `- tailwindcss ^3.4.0 (current: 4.x; reason: v4 CSS-first config too new for v1)`.
4. **Skip-with-warning works.** Run with no network → Architect emits `Version check skipped: npm view exit 1` footer; plan still produced.
5. **Mirror parity.** `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` returns empty.
6. **End-to-end re-test.** Run a fresh sprint with the new Architect; observe (a) plan dep versions match npm registry, (b) Developer dispatches don't waste turns on dep corrections.

**Test commands:**

- `npm view vite version` — sanity check (returns current).
- Manual smoke per acceptance steps.

**Pre-commit:** one commit `feat(CR-037): architect pre-spec dep version check via npm view`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic declared (training-data memory drifts; no validation step today).
- [x] All impacted downstream items identified (no backfill; offline mitigation via skip-with-warning).
- [x] Execution Sandbox names exact files + prompt addition.
- [x] Verification with 6 acceptance scenarios + sample drift cases from the test.
- [ ] **Open question:** Validation scope — every dep vs scaffold-only (§0.5 Q1).
- [ ] **Open question:** Behavior on drift — auto-pin vs explicit decision (§0.5 Q2).
- [ ] **Open question:** Network access — confirmed Bash present (§0.5 Q3).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q4).~~ Resolved 2026-05-03: SPRINT-21 (W1).
- [ ] `approved: true` is set in the YAML frontmatter.
