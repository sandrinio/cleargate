---
cr_id: CR-043
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-22
carry_over: false
status: Done
approved: true
approved_at: 2026-05-04T08:30:00Z
approved_by: sandrinio
created_at: 2026-05-04T08:00:00Z
updated_at: 2026-05-04T08:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Mid-sprint user feedback 2026-05-04: "Do we write Red and Green phases?
  (TDD)? how will dev and QA work together from now on?" Answer: currently
  no Red/Green; Dev writes both impl + tests in one commit; QA verifies
  after.

  Evidence: SPRINT-21 CR-030 attempt-1 (commit 3caa056) shipped option α
  (broken AND-semantics) because the only existing test for the gate used
  prose context_source which bypassed file-resolution. Architect's bounce
  review verbatim: "the fixture writes a real parent file to disk so
  context_source resolution actually runs — exactly the gap that masked
  α's AND defect." Same Dev wrote impl + tests; same blind spot; α slipped
  through. Bounce cost: ~3.7hr Dev rework + 2.3hr QA hang.

  V-Bounce-Engine reference (skills/agent-team/SKILL.md L313-390): Red/Green
  TDD with Team-Lead-only Test Pattern Validation gate between phases. Dev
  is forbidden from modifying Red tests. Adapted to ClearGate's four-agent
  loop as a QA-Red dispatch inserted between Architect M-plan and Dev.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T08:46:45Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-043
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T08:46:44Z
  sessions: []
---

# CR-043: Red/Green TDD Discipline + QA-Red Dispatch

## 0.5 Open Questions

- **Question:** Should QA-Red apply to lane=fast stories or only standard?
  - **Recommended:** standard only. Fast lane (XS/L1) is short enough that the rework cost of an α-class defect is small. Adding a QA-Red dispatch to every fast-lane story adds ~10min × N dispatches per sprint = high-overhead-low-yield.
  - **Human decision:** _populated during Brief review_

- **Question:** Is QA-Red a NEW agent (`qa-red.md`) or a MODE of existing QA agent (a flag in dispatch prompt)?
  - **Recommended:** existing `qa.md` agent file with TWO distinct dispatch prompt templates (RED, VERIFY) provided by the orchestrator. The `qa.md` prompt stays generic; orchestrator dispatch text injects mode-specific instructions ("Mode: RED — write failing tests against §4 acceptance, no implementation Read access" OR "Mode: VERIFY — read-only acceptance trace"). SKILL.md §C documents both dispatch shapes. No new agent file. Tool-permission split is informal (we trust the dispatch contract). If after SPRINT-23 the QA agent drifts between modes (Reads source in Red, etc.), promote to a separate qa-red.md file as a future CR.
  - **Human decision:** ✅ accepted as Recommended (sandrinio 2026-05-04)

- **Question:** What prevents Dev from "fixing" QA-Red tests by weakening assertions (test-tampering)?
  - **Concrete failure mode:** QA-Red writes `calculator.red.test.ts` asserting `add(2,3) === 5`. Dev is supposed to write `add()` to make it pass. BAD outcome: Dev edits the test to assert `add(2,3) === undefined`, ships an empty `add()`, test passes, spec violated. CR-030 attempt-1 evidences this class of bypass.
  - **Recommended:** pre-commit hook enforcement. Extend `.claude/hooks/pre-commit-surface-gate.sh` to reject any Dev commit on a story branch that includes a diff in `**/*.red.test.ts` files after the QA-Red commit landed. Bypass via `SKIP_RED_GATE=1` env var (logged like other bypasses). SKILL.md §C.3 Dev dispatch contract additionally states the rule in prompt text for clarity. Architect post-flight optionally verifies the QA-Red test file hash against what the QA-Red dev report claimed (trust-but-verify).
  - **Human decision:** ✅ accepted as Recommended (sandrinio 2026-05-04 — pre-commit hook enforcement, not just written rule)

- **Question:** What's the file-naming convention for Red tests?
  - **Recommended:** `*.red.test.ts` for QA-Red-authored tests (immutable post-Red). `*.test.ts` for Dev-authored tests. Dev cannot modify `*.red.test.ts`. Pre-commit hook enforces. Post-CR-040 (vitest→node:test migration), all tests run via `tsx --test 'test/**/*.test.ts'` which globs both `.test.ts` AND `.red.test.ts`.
  - **Human decision:** _populated during Brief review_

- **Question:** Test Pattern Validation gate (V-Bounce L339-355) — is this a separate Architect dispatch between QA-Red and Dev, or does Architect M-plan pre-validate?
  - **Recommended:** SPRINT-22 ships the QA-Red + Dev contract only. Test Pattern Validation gate is a separate concern (V-Bounce L339-355's "Team-Lead-only" mock/import/constructor verification) — folded into CR-047 in SPRINT-23 to avoid scope creep here.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The four-agent loop is Architect → Developer → QA → Reporter (per current SKILL.md §C).
- Dev writes both implementation AND tests in one commit.
- QA verifies after Dev — read-only acceptance trace.
- "Tests" and "implementation" are written by the same agent in the same commit.

**New Logic (The New Truth):**
- The four-agent loop becomes Architect → **QA-Red** → Developer → **QA-Verify** → Architect post-flight (5 dispatches per standard-lane story; fast lane skips QA-Red).
- QA-Red writes failing tests against the spec acceptance — no implementation access. Tests must fail with "not yet implemented" errors against the clean baseline.
- Developer makes the failing tests pass + adds additional tests for edge cases. **Forbidden from modifying QA-Red tests.**
- QA-Verify (renamed from QA) does read-only acceptance trace via grep + diff. Same as current QA per `feedback_qa_skip_test_rerun.md`.
- Test files use naming convention: `*.red.test.ts` for QA-Red-authored (immutable post-Red); `*.test.ts` for Dev-authored.

## 2. Blast Radius & Invalidation

- [ ] **`.claude/skills/sprint-execution/SKILL.md` §C** rewrites the per-story execution loop. §C.3 expanded with QA-Red dispatch step. §C.4 (current QA) renamed to "QA-Verify".
- [ ] **`cleargate-planning/.claude/agents/qa.md`** — generic prompt updated to support BOTH modes (RED + VERIFY); dispatch-text-driven mode selection. NO new agent file (option A-hybrid per §0.5 Q8).
- [ ] **`cleargate-planning/.claude/agents/developer.md`** — prompt updated with "forbidden from editing `*.red.test.ts`" guardrail.
- [ ] **`.claude/hooks/pre-commit-surface-gate.sh`** — extended to reject any Dev commit on a story branch that includes a diff in `**/*.red.test.ts` after the QA-Red commit landed. Bypass via `SKIP_RED_GATE=1` env var (mirrors existing `SKIP_SURFACE_GATE` bypass pattern).
- [ ] **State machine** — `state.json` per-story state set adds optional intermediate states: `Red Written`, `Green In Progress` (between current `Ready to Bounce` and `QA Passed`). Or: keep the state machine flat; track Red/Green via report file presence. **Recommended:** keep state machine flat (CR-040 simpler).
- [ ] **Token-ledger** — `agent_type=qa-red` added to valid set in `.claude/hooks/token-ledger.sh` and consumers (suggest_improvements.mjs).
- [ ] **`cleargate-cli/test/_node-test-runner.md`** — add section explaining `*.red.test.ts` naming + Dev-immutability rule.
- [ ] **Sample fixture** — `cleargate-cli/examples/red-green-example/` — directory with one `*.red.test.ts` + one `*.test.ts` showing the pattern. Located OUTSIDE `test/` so the `npm test` glob (`test/**/*.node.test.ts`) does NOT auto-run it; Architects reference this in M-plans for pedagogical purposes.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:§C` (current per-story execution loop).
- **Surface:** `cleargate-planning/.claude/agents/qa.md` (current QA prompt; will rename conceptually).
- **Surface:** `cleargate-planning/.claude/agents/developer.md` (current Dev prompt; needs forbidden-region rule).
- **Surface:** `.cleargate/sprint-runs/SPRINT-21/reports/CR-030-qa.md` — concrete evidence of α-defect that Red phase would have caught.
- **Why this CR extends rather than rebuilds:** the four-agent loop already exists; we're inserting one new agent (QA-Red) between Architect and Developer + tightening prompt boundaries. Not a from-scratch process. Design provenance: V-Bounce-Engine `agent-team` skill (external reference cited in `context_source` only — not a local surface).

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — §C rewrite: insert QA-Red dispatch step (between current §C.2 worktree creation and §C.3 spawn Developer); rename current §C.4 QA → "QA-Verify" in prose; add fast-lane skip rule for QA-Red
- `cleargate-planning/.claude/agents/developer.md` — forbidden-region rule (no edits to `*.red.test.ts`)
- `cleargate-planning/.claude/agents/qa.md` — generic prompt covers BOTH modes (RED + VERIFY); dispatch-text drives mode selection
- `.claude/hooks/pre-commit-surface-gate.sh` — extend with `*.red.test.ts` immutability check (rejects Dev commits modifying Red tests; `SKIP_RED_GATE=1` bypass)
- `cleargate-cli/test/_node-test-runner.md` — add `*.red.test.ts` naming convention + Dev-immutability rule

**Add:**
- `cleargate-cli/examples/red-green-example/calculator.red.test.ts` (sample Red test — outside `test/` glob so npm test doesn't auto-run)
- `cleargate-cli/examples/red-green-example/calculator.test.ts` (sample Green test — same reason)
- `cleargate-cli/examples/red-green-example/calculator.ts` (sample impl)
- `cleargate-cli/examples/red-green-example/README.md` (explanation referenced by Architect M-plans for Red/Green pattern guidance)

**Auto-regenerated:**
- `cleargate-cli/templates/cleargate-planning/.claude/{agents,skills,hooks}/...` (via `npm run prebuild`)
- `cleargate-planning/MANIFEST.json` (via prebuild)

**Hand-port (post-merge):**
- Live `.claude/skills/sprint-execution/SKILL.md`, `.claude/agents/qa-red.md`, `.claude/agents/developer.md`, `.claude/agents/qa.md` (gitignored; sync via `cleargate init` or hand-port).

**Out of scope:**
- Test Pattern Validation gate (V-Bounce L339-355) — folded into CR-047 in SPRINT-23.
- Renaming the qa.md FILE itself (just role boundary change in prose). File rename comes if needed in CR-047.
- Refactoring existing tests to Red/Green pattern. New stories from SPRINT-22 onward use the new pattern; existing tests stay as-is.

## 4. Verification Protocol

**Acceptance:**
1. `cleargate-planning/.claude/agents/qa.md` updated to cover BOTH modes (RED + VERIFY); dispatch-text-driven mode selection. NO new agent file created.
2. `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C documents the new 5-step loop (Architect → QA-Red dispatch → Dev → QA-Verify dispatch → Architect post-flight) with explicit fast-lane skip rule for QA-Red. Two distinct dispatch-prompt templates (RED, VERIFY) shown verbatim in §C.3 + §C.4 respectively.
3. `cleargate-planning/.claude/agents/developer.md` includes a "Forbidden Surfaces" section listing `**/*.red.test.ts` as immutable for Developer dispatches.
4. `.claude/hooks/pre-commit-surface-gate.sh` rejects a test commit on a story branch that includes a diff in `*.red.test.ts` after the QA-Red commit. Manual smoke: create fixture branch, commit `*.red.test.ts`, attempt Dev commit modifying that file, expect pre-commit rejection. `SKIP_RED_GATE=1` bypass works + logs.
5. Sample fixture at `cleargate-cli/examples/red-green-example/` runs end-to-end via explicit `npx tsx --test cleargate-cli/examples/red-green-example/`: `calculator.red.test.ts` fails when `calculator.ts` is empty; both Red + Green tests pass after impl. NOT auto-run by `npm test` (out-of-glob). Architect M-plans reference this fixture as canonical Red/Green pattern.
6. Mirror parity: `diff cleargate-planning/.claude/agents/qa.md cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` empty post-prebuild.
7. `cleargate-cli/test/_node-test-runner.md` documents `*.red.test.ts` naming + Dev-immutability rule.
8. **Process acceptance (validated retrospectively at SPRINT-23 close):** ≥1 standard-lane story in SPRINT-23 ran the full Architect → QA-Red → Dev → QA-Verify → Architect post-flight loop with all required reports present. If 0, downgrade to fast-lane only.

**Test Commands:**
- `grep -A 10 "Forbidden Surfaces" cleargate-planning/.claude/agents/developer.md`
- `cd cleargate-cli && tsx --test test/fixtures/red-green-example/calculator.red.test.ts` — should fail (Red phase before impl)
- `cd cleargate-cli && tsx --test test/fixtures/red-green-example/` — should pass after Green impl
- (Manual) test pre-commit hook with a fixture diff against `*.red.test.ts`

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (post-CR-040 routing). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream items identified (SKILL.md, agent prompts, hooks, sample fixture).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (8 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
