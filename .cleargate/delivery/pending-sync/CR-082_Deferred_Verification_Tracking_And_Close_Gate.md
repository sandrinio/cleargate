---
cr_id: CR-082
parent_ref: EPIC-045
parent_cleargate_id: EPIC-045
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
area: framework/qa-loop
context_source: |
  SPRINT-66 dogfood observation log finding F11 (loop integrity), captured live during
  the new_app/Chyro v2-parallel run on 2026-06-02/03:
  `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md:761-764` —
  "Static-scope QA can pass a story whose deferred heavy verification fails; caught only
  post-merge." STORY-115-05 was QA-PASSed on "static-gate scope" (deps declared in
  pyproject + Dockerfile; ACCEPTANCE_COVERAGE 7 of 8, Scenario 5 build+boot marked
  "orchestrator R4 smoke, out of static scope" — see obs lines 218, 229-233). Its real
  acceptance — a `docker build` + offline-Chromium smoke (~500-700MB) — was deferred to
  the orchestrator and only run POST-MERGE, where the merged Dockerfile's
  `RUN playwright install` exited 127 (`playwright` CLI absent from the `python:3.12-slim`
  runtime stage). The build FAILED; a broken Dockerfile rode the sprint branch until
  follow-up fix `b249b8a1` (merge `1e8073e4`). The story reached Done/merged with its real
  gate unrun. The hour-1 synthesis (obs line 306) had already flagged the gap: "no visible
  tracking that the orchestrator actually runs the deferred smoke before close." Routes to
  EPIC-045 framework hygiene per the tech-debt-findings memory directive.
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:32:12Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:18.611Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
---

# CR-082: Track deferred heavy verifications and enforce them at the close gate

## 0.5 Open Questions

- **Question:** Should an un-run deferred verification block *merge* (story can't reach Done), block *sprint-close* (story merges but close halts until all deferred verifications are green), or both?
- **Recommended:** Block close, not merge — with a distinct non-terminal QA status (`PASS-PENDING-SMOKE`) that lets the story merge to the sprint branch but does NOT count as fully Done. Rationale: the deferred verification is deliberately heavy (a ~500-700MB docker build); forcing it to run inside the per-story worktree barrier (block-merge) reimposes the exact cost the deferral was designed to amortize, and parallel waves would each pay it. Block-close gates the *sprint branch as a whole* once, before the human ack — the natural amortization point. Optionally add a soft block-merge warning (status surfaced, not enforced) so a deferred-owing story is visibly distinct from a fully-Done one on the branch.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** Where is the deferred-verification *result* (ran / green / red, timestamp, command output ref) recorded so the close gate can read it deterministically?
- **Recommended:** A sibling artifact under the sprint run — `.cleargate/sprint-runs/<id>/deferred-verify/<STORY-ID>.json` — written by whoever runs the deferred command (orchestrator or a `cleargate verify deferred <story>` wrapper), shape `{ story, command, ran_at, exit_code, status: green|red|unrun }`. The close gate (Step 2.7-class) scans the story frontmatter for declared `deferred_verification:` blocks and cross-checks each against a matching green result file. Reading state from a committed artifact (not chat) keeps the gate deterministic and re-runnable, consistent with how Step 2.7/2.8 already inject state via env seams.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** What is the exact shape of the `deferred_verification:` story-frontmatter field — single command or a list, and what sub-fields?
- **Recommended:** A list (a story may owe more than one heavy check), each entry `{ description: <human string>, command: <shell string the orchestrator must run from repo root>, blocks: close }`. `blocks` defaults to `close`; `merge` is the opt-in stricter value tied to Q1. Absent/empty field = no deferred verification (the common case), so it is fully backward-compatible with every existing story.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- A story may reach **Done / merged** on STATIC-scope QA while its real, heavy acceptance is deferred and unrun. There is currently **no mechanism** to (a) record that a story owes a deferred verification or (b) block merge / sprint-close until that verification runs green. QA's `PASS` verdict (`.claude/agents/qa.md:143`) is binary — a "PASS (static-gate scope)" with `ACCEPTANCE_COVERAGE: 7 of 8` and a deferred Scenario 5 is recorded as a full PASS, indistinguishable downstream from a complete one.
- Stop treating "the orchestrator will run the heavy smoke later" as sufficient. SPRINT-66 STORY-115-05 proved a deferred-and-trusted verification can FAIL post-merge (Dockerfile `RUN playwright install` → exit 127) with the broken artifact already on the sprint branch.

**New Logic (The New Truth):**
- A `deferred_verification:` story-frontmatter field (list of `{ description, command, blocks }`) records exactly what heavy check the story owes and how to run it. Absent/empty = no obligation (backward-compatible).
- A non-terminal QA verdict status — `PASS-PENDING-SMOKE` — distinguishes "static gate green, heavy verification still owed" from a full `PASS`. A story in this status does **not** count as fully Done.
- `close_sprint.mjs` gains a deferred-verification gate (Step 2.7-class): close **BLOCKS** until every story's declared `deferred_verification` entries have a matching green result. An unrun or red deferred verification halts close exactly as a leftover worktree (Step 2.7) or unmerged sprint branch (Step 2.8) does today.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Update/Invalidate Epic: [EPIC-045] — this CR is a leaf hygiene addition under the framework-hygiene epic; it adds a gate, it does not redefine the epic's scope.
- [ ] Update template: `.cleargate/templates/story.md` — add the optional `deferred_verification:` frontmatter field + a one-line doc comment. Backward-compatible (absent treated as empty).
- [ ] Update agent: `.claude/agents/qa.md` — add `PASS-PENDING-SMOKE` to the verdict vocabulary + the rule that a deferred-acceptance scenario yields that status, not `PASS`.
- [ ] Update script: `.cleargate/scripts/close_sprint.mjs` — add the deferred-verification close gate + a test seam (env-injection, mirroring `CLEARGATE_SKIP_WORKTREE_CHECK` / `CLEARGATE_FORCE_WORKTREE_PATHS`).
- [ ] **Co-edit ordering flag:** `.claude/agents/qa.md` is the ONLY surface this CR shares with the rest of the SPRINT-66-finding CR batch — **CR-081** also edits `qa.md`'s DoD/verdict region. This CR is otherwise **independent** (no shared close_sprint.mjs / story.md surface with the other CRs). If CR-081 and CR-082 land in the same sprint, sequence the `qa.md` edits (one rebases on the other) so the verdict-vocabulary changes don't collide.
- [ ] Database schema impacts? No — pure planning-scaffold change (one frontmatter field, one agent-instruction string, one close-script gate + its node:test). No `mcp/` / `admin/` / DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against this meta-repo checkout (cite file:line).
> Cite paths with at least one '/' separator.

- **Surface:** `.cleargate/scripts/close_sprint.mjs:568-607` — Step 2.7 "Worktree-Closed Check" blocks close if any `.worktrees/STORY-*` path is present, with env test seams (`CLEARGATE_SKIP_WORKTREE_CHECK`, `CLEARGATE_FORCE_WORKTREE_PATHS`). Step 2.8 (the sprint-branch-merged check, env seams `CLEARGATE_SKIP_MERGE_CHECK` / `CLEARGATE_FORCE_MERGE_STATUS` at lines 47-52) is the sibling gate. The new deferred-verification gate is modeled directly on these — same block-on-state, same env-seam pattern.
- **Surface:** `.claude/agents/qa.md:140-152` — the QA output shape defines `QA: PASS | FAIL` (binary) plus `ACCEPTANCE_COVERAGE: N of M` and `VERDICT`. This is exactly where `PASS-PENDING-SMOKE` and the "deferred acceptance scenario → pending status, not PASS" rule are added.
- **Surface:** `.cleargate/templates/story.md:56-96` — the story frontmatter block (e.g. `lane:` at line 69, `db_write_set:` at line 70). The optional `deferred_verification:` list field is added here as a sibling advisory field.
- **Why this CR extends rather than rebuilds:** the close-gate machinery already exists (Steps 2.7/2.8 are block-on-state gates with env seams), the QA verdict surface already exists, and the story frontmatter already carries advisory per-story fields (`lane`, `db_write_set`). This CR adds one more field, one more verdict value, and one more gate cut from the existing Step-2.7 mold — it does not author a new subsystem.

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify:**
- `.cleargate/templates/story.md` — add optional `deferred_verification:` frontmatter field (list of `{ description, command, blocks }`) + doc comment.
- `.claude/agents/qa.md` — add `PASS-PENDING-SMOKE` verdict status + the deferred-acceptance → pending-status rule (coordinate ordering with CR-081 — see §2).
- `.cleargate/scripts/close_sprint.mjs` — add the deferred-verification close gate (Step 2.7-class) + env test seams.

**Create:**
- `.cleargate/sprint-runs/<id>/deferred-verify/<STORY-ID>.json` — per-story deferred-verification result artifact (written at run-time; schema documented in the gate, not a tracked source file).
- A node:test under `.cleargate/scripts/` (e.g. `close_sprint.deferred-verify.node.test.ts`) exercising the new gate via env seams.

**Sync reminder:** these edit canonical surfaces (`.cleargate/templates/`, `.claude/agents/`, `.cleargate/scripts/`) that have a `cleargate-planning/` mirror — after landing, re-sync the live `/.claude/` + `/.cleargate/` instance and the npm payload (`cleargate-cli/templates/`) per the Dogfood-split rule.

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test:**
- `node --test --import tsx/esm .cleargate/scripts/close_sprint.deferred-verify.node.test.ts` exits 0, asserting: (1) a sprint with a story declaring `deferred_verification` and **no** matching green result file → close gate FAILS (non-zero exit / halt); (2) the same with a green result file present → gate PASSES; (3) a sprint with no `deferred_verification` declarations anywhere → gate is a silent no-op (backward-compatible). Use an env seam mirroring `CLEARGATE_FORCE_WORKTREE_PATHS` to inject deferred-verify state without real runs.
- `grep -n "PASS-PENDING-SMOKE" .claude/agents/qa.md` returns the new verdict status in the output-shape section.
- `grep -n "deferred_verification" .cleargate/templates/story.md` returns the new optional field.
- Regression: an existing sprint fixture with zero `deferred_verification` declarations still closes green (the gate adds no friction to the common case).

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log and recorded owner direction.

**context_source:** SPRINT-66 dogfood observation log finding F11 (`.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md:761-764`) + hour-1 synthesis deferred-verification gap (obs line 306) + STORY-115-05 dev/QA reports (obs lines 218, 229-233). Routes to EPIC-045 per the tech-debt-findings memory directive. Sibling CRs from the same observation log; only `qa.md` co-edited with CR-081 (ordering flagged in §2).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 declares the "Done on static QA while heavy verification deferred-and-unrun" gap and the binary-PASS overstatement as the logic to evict.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Story depends on this leaf gate addition; parent EPIC-045 is identified in §2. The only cross-item coupling is the shared `qa.md` edit with CR-081, flagged in §2 with an ordering note. Nothing to revert.*
- [x] Execution Sandbox contains exact file paths. — *§3 lists three exact modify-paths plus the result-artifact + test to create.*
- [x] Verification command is provided. — *§4 gives a concrete `node --test` command + grep assertions + a backward-compat regression.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Filed from the SPRINT-66 finding; approval is a separate Gate-1 step pending the §0.5 decisions (block-merge vs block-close, result-recording location, field shape).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Three verified paths cited with line numbers: close_sprint.mjs:568-607, qa.md:140-152, story.md:56-96.*
