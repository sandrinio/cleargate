---
cr_id: CR-036
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Live evidence 2026-05-03 — markdown_file_renderer end-to-end test. Sprint
  close in the test folder consumed 23.85M tokens cumulative
  (`.cleargate/sprint-runs/SPRINT-01/.session-totals.json`). Of that, 13.07M
  tokens were the Reporter agent's single dispatch (12th SubagentStop row at
  ts:2026-05-03T07:20:36Z). Output: 23KB SPRINT-01_REPORT.md. Token-per-output
  ratio: ~570 tokens of input cache_read per character of output.

  Architecture investigation:
    - The Reporter prompt (.claude/agents/reporter.md L11+L17) declares
      "Default input: .reporter-context.md (built by prep_reporter_context.mjs
      at close pipeline Step 3.5). Fall back to source files only when the
      bundle is incomplete or missing."
    - close_sprint.mjs:513-525 invokes prep_reporter_context.mjs as Step 3.5,
      explicitly marked non-fatal: "On failure, Reporter falls back to
      broad-fetch context loading."
    - prep_reporter_context.mjs (466 LOC) extracts: sprint plan slices, state.json
      summary, milestone plans, git log digest, token ledger digest, flashcard
      slice. The script exists and is comprehensive.
    - **Test folder reality:** `.cleargate/sprint-runs/SPRINT-01/.reporter-context.md`
      DOES NOT EXIST. Step 3.5 either failed silently or was skipped. Reporter
      had no bundle and fell back to source-file ingestion.
    - Compounded by session_id inheritance: the Reporter dispatch shared
      session_id 69df1822-3425-4408-bc7f-8fcd99856e58 with all 11 prior dev+qa
      dispatches. Per the ledger, cache_read at row 11 was 10,558,389; at row
      12 (Reporter) it was 23,008,199 — the Reporter inherited 10.5M of
      cumulative session cache from prior agent turns alone. ~96.5% of the
      sprint's cumulative tokens were cache_read.

  Two structural gaps cause the cost:
    1. Step 3.5 is non-fatal → bundle absence is silent → Reporter quietly
       falls back to the most expensive path (source files + session inheritance).
    2. No token budget assertion → a 13M-token Reporter dispatch passes
       without warning. Nothing in the framework says "this is wrong."

  Lean target: ~80-100k tokens for the same 23KB report. That's a ~99%
  reduction. Achievable via three changes: (a) Step 3.5 becomes fatal under
  v2; (b) Reporter prompt forbids source-file reads when bundle is present;
  (c) Reporter dispatched in a fresh session_id.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T17:47:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-036
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:31Z
  sessions: []
---

# CR-036: Reporter Token Diet — Make Bundle Mandatory, Forbid Source-File Fallback, Dispatch Fresh Session

## 0.5 Open Questions

- **Question:** Step 3.5 fatality — block close on bundle generation failure (v2), or stay non-fatal and add a hard `WARN: BUNDLE MISSING` to stdout?
  - **Recommended:** **fatal under v2**, warn-only under v1. v2 sprints already enforce mirror-parity, decomposition, etc.; bundle generation is on the same tier. v1 keeps its escape hatch for legacy flows. Failure mode is a clear stderr block listing what the prep script needed and didn't find — agent can fix and re-run close.
  - **Human decision:** _populated during Brief review_

- **Question:** Source-file fallback in Reporter prompt — remove entirely, or keep as opt-in via explicit dispatch flag?
  - **Recommended:** **remove the fallback path from reporter.md when bundle is present**. Today's "fall back when incomplete or missing" is too permissive — the agent gets to decide what "incomplete" means and reads everything to be safe. New rule: bundle present → bundle is the only input (plus the template). Bundle absent → close pipeline failed and the Reporter shouldn't be dispatched at all. Only escape hatch is `CLEARGATE_REPORTER_BROADFETCH=1` env (logged + flashcarded if used).
  - **Human decision:** _populated during Brief review_

- **Question:** Fresh session_id — Reporter spawned with explicit session reset, or accept the inheritance and rely on prompt scope to ignore it?
  - **Recommended:** **fresh session_id**. Inheritance carried 10.5M cache_read into the Reporter dispatch in the test — that cost is structural, not addressable via prompt. Implementation: orchestrator sprint-execution skill protocol gains a "Reporter dispatched in new session" instruction; if Claude Code's `Agent` tool doesn't natively support session reset, the agent is invoked via a fresh `claude --resume false` shell child. Worth confirming what the SDK supports.
  - **Human decision:** _populated during Brief review_

- **Question:** Token budget assertion — soft warn or hard fail when Reporter exceeds threshold?
  - **Recommended:** **soft warn** at 200k tokens, **hard advisory** at 500k. The token-ledger SubagentStop hook already runs; add a check that emits `⚠️ Reporter token budget exceeded: <actual> > <threshold>` to stdout (per CR-032 surfacing pattern). Hard fail risks false positives during legitimately large sprints; soft warn surfaces drift early.
  - **Human decision:** _populated during Brief review_

- **Question:** `prep_reporter_context.mjs` failure mode investigation — file as a separate diagnostic CR, or fold into this one?
  - **Recommended:** **fold the diagnostic into this CR's verification step**. Run the prep script standalone against the test folder's SPRINT-01; capture the failure cause; fix as part of CR-036 acceptance #1 (script must succeed against a known-good sprint). If the failure is environmental (missing dependency, path issue), surface as flashcard. If structural, fix in this CR.
  - **Human decision:** _populated during Brief review_

- **Question:** Sprint inclusion?
  - **Recommended:** ~~**SPRINT-20** if not yet activated~~. **Stale rec — SPRINT-20 shipped in commit `618fadc`.** Defaults to SPRINT-21.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W3 Developer dispatch 4. Note: the fresh-session_id question (§0.5 Q3) is the same mechanic CR-039 spikes in W4 — wave order is inverted, so CR-036 absorbs the unknown. If fresh-session can't be implemented natively in the Agent tool, fall back to no-op for v1 and let CR-039's findings inform a follow-up CR.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **`close_sprint.mjs:514-525` Step 3.5 is non-fatal.** Bundle generation failure produces a stderr warning and the close proceeds. Reporter then falls back silently. There is no signal to the human or the agent that the cheap path was lost.
- **`reporter.md` "fall back to source files only when the bundle is incomplete or missing"** (L17, L29-35) — too permissive. The agent has discretion over what "incomplete" means; today's evidence is that under fall-back, the agent reads everything.
- **Reporter dispatched in the same session_id as dev+qa loops** — orchestrator pattern shared across `sprint-execution` skill (`.claude/skills/sprint-execution/SKILL.md` reporter dispatch section). Inheritance carries cumulative dev+qa cache_read into the Reporter dispatch.
- **No token budget assertion** — the token-ledger SubagentStop hook records the cost but does not flag outliers. A 13M-token Reporter dispatch produces zero warnings.

**New Logic (The New Truth):**

Three coordinated changes turn the Reporter from a 13M-token broad-fetch agent into a ~100k-token bundle-fed agent.

**Change 1 — Bundle generation becomes mandatory.** `close_sprint.mjs:514-525` Step 3.5 promotion:
- Under `execution_mode: "v2"` (sprint frontmatter): if `prep_reporter_context.mjs` fails OR if the resulting `.reporter-context.md` is absent / empty / smaller than 2KB → close exits non-zero with a structured error block listing what the prep script needed and didn't find. No Reporter dispatch.
- Under `execution_mode: "v1"`: keep current non-fatal warning. Backwards compat.

**Change 2 — Reporter prompt removes the silent fallback path.** `.claude/agents/reporter.md` L11-17 + L29-35 rewrite:
- New default-input section: "**You read exactly two files:** `.cleargate/sprint-runs/<id>/.reporter-context.md` and `.cleargate/templates/sprint_report.md`. Do not Read, Grep, or Bash-shell-out to any source file (story bodies, plan files, raw git log, hook log, FLASHCARD.md cumulative). The bundle contains pre-extracted slices of all of these. If a slice is missing, surface that as a Brief footnote ('§N could not be filled — bundle slice missing for <X>') — do not fix by reading source files."
- Escape hatch: env `CLEARGATE_REPORTER_BROADFETCH=1` (logged in stdout + auto-flashcarded by the orchestrator). Reserved for diagnostics; not a normal path.

**Change 3 — Reporter dispatched in a fresh session_id.** `.claude/skills/sprint-execution/SKILL.md` Reporter dispatch section gains: "Spawn the Reporter in a fresh session — do not inherit context from the dev+qa loop. The Reporter starts cold and reads only the bundle + template. If the `Agent` tool's session-reset semantics are unclear, document the actual behavior and adjust." Implementation detail: if SDK supports session_id override on dispatch, use it; otherwise spawn via a fresh shell child (`claude --resume false ...` or equivalent). Verification at acceptance time.

**Change 4 (bonus, low-cost) — Token budget assertion.** `.claude/hooks/token-ledger.sh` (post-CR-036 in the SubagentStop chain) — when `agent_type == "reporter"` and `delta` (input + output + cache_creation + cache_read) > 200,000 → emit `⚠️ Reporter token budget exceeded: <actual> > 200,000` to stdout (carried into chat per CR-032 pattern). Hard advisory at 500,000 logs a flashcard automatically.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing sprints with no `.reporter-context.md`** — close still works under v1; under v2, close re-runs fail until prep script succeeds. v1 fallback preserved as escape valve.
- [x] **Update Epic:** EPIC-008 (cost + measurement family — token ledger + readiness gates parent).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local close-pipeline + agent-prompt changes.
- [ ] **Audit log:** New `BUNDLE_MISSING` close-fail entry shape under v2. Token-ledger SubagentStop rows gain optional `budget_warning: true` field (additive; backwards compat).
- [ ] **Coupling with CR-035** (Reporter token off-by-one): both touch Reporter dispatch boundary. Ship together if possible — single Reporter-prompt edit covers both. CR-035 fixes accounting; CR-036 fixes the underlying cost.
- [ ] **Coupling with CR-032** (surface gate failures): the budget-warning stdout uses the same chat-injection pattern. Land CR-032 first OR concurrently to ensure the warning is visible.
- [ ] **Coupling with CR-021** (close pipeline): Step 3.5's promotion to fatal under v2 is a CR-021 contract change. Verify with the lifecycle reconciler test suite that close still passes for fixture sprints with valid bundles.
- [ ] **FLASHCARD impact:** add card on completion — *"Reporter reads bundle + template; never source files. Step 3.5 fatal under v2. Fresh session_id at dispatch. Budget warn at 200k, advisory at 500k. Reporter cost dropped from ~13M to ~100k tokens per sprint close."*
- [ ] **Scaffold mirror:** `.claude/agents/reporter.md` + canonical mirror byte-equal post-edit. Same for `.cleargate/scripts/close_sprint.mjs` if mirrored. Same for sprint-execution skill if mirrored.
- [ ] **Quality regression risk:** the Reporter loses access to source files. Risk: report quality drops if the bundle is missing slices the report needs. Mitigation: §0.5 Q5 (diagnostic on existing prep script) + acceptance #4 (golden-snapshot test).

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `.cleargate/scripts/close_sprint.mjs` — Step 3.5 invokes `prep_reporter_context.mjs`; failure currently warn-only. This CR promotes to v2-fatal.
- **Surface:** `.cleargate/scripts/prep_reporter_context.mjs` — bundle generator; this CR's verification step diagnoses why it silently skipped in the test fixture.
- **Surface:** `.claude/agents/reporter.md` — Reporter prompt's "fall back to source files when bundle incomplete" path; this CR removes the fallback unless `CLEARGATE_REPORTER_BROADFETCH=1`.
- **Surface:** `.claude/hooks/token-ledger.sh` — SubagentStop hook; this CR adds a Reporter-budget check that emits `⚠️ Reporter token budget exceeded` per CR-032 surfacing pattern.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §E.2 — Reporter dispatch site; this CR adds "fresh session_id" instruction.
- **Why this CR extends rather than rebuilds:** every change is additive (one mandatory check, one fallback removal, one budget assertion, one dispatch instruction); the close-pipeline structure stands.

## 3. Execution Sandbox

**Modify (close pipeline — 1 file + 1 mirror):**

- `.cleargate/scripts/close_sprint.mjs:513-525` — promote Step 3.5 to fatal under v2:
  ```js
  // ── Step 3.5: Build curated Reporter context bundle ───────────────────
  const bundlePath = path.join(sprintDir, '.reporter-context.md');
  process.stdout.write('Step 3.5: building Reporter context bundle...\n');
  try {
    invokeScript('prep_reporter_context.mjs', [sprintId], { ... });
    if (!fs.existsSync(bundlePath) || fs.statSync(bundlePath).size < 2048) {
      throw new Error(`bundle missing or too small (<2KB): ${bundlePath}`);
    }
    process.stdout.write(`Step 3.5 passed: ${bundlePath} ready.\n`);
  } catch (err) {
    if (executionMode === 'v2') {
      process.stderr.write(`Step 3.5 FAILED (v2 hard-block): ${err.message}\n`);
      process.stderr.write('Cannot dispatch Reporter without bundle. Fix prep script and re-run close.\n');
      process.exit(1);
    } else {
      process.stderr.write(`Step 3.5 warning (v1 non-fatal): ${err.message}\n`);
      process.stderr.write('Reporter will fall back to broad-fetch context loading.\n');
    }
  }
  ```
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — byte-equal mirror.

**Modify (Reporter agent prompt — 1 file + 1 mirror):**

- `.claude/agents/reporter.md` L11-17 (Capability Surface "Default input" row) + L29-35 (Inputs section) — rewrite per Change 2 above. Add escape-hatch env documentation. Strip the "fall back to source files" framing; replace with "bundle or surface-as-footnote."
- `cleargate-planning/.claude/agents/reporter.md` — byte-equal mirror.

**Modify (orchestrator skill — 1 file + 1 mirror):**

- `.claude/skills/sprint-execution/SKILL.md` Reporter dispatch section (~L377 region) — add Change 3 instruction. Document session-reset mechanism (SDK support + fallback approach).
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — byte-equal mirror.

**Modify (token-ledger hook — 1 file + 1 mirror):**

- `.claude/hooks/token-ledger.sh` — after row write, when `agent_type == "reporter"`, compute `total = input + output + cache_creation + cache_read` and emit:
  - `total > 200000`: stdout `⚠️ Reporter token budget exceeded: <total> > 200,000`
  - `total > 500000`: same line + auto-append flashcard via `cleargate flashcard record "Reporter dispatch exceeded 500k tokens — investigate prompt or bundle"`. ~10 lines of bash.
- `cleargate-planning/.claude/hooks/token-ledger.sh` — byte-equal mirror.

**Tests (2-3 files):**

- `cleargate-cli/test/scripts/test_close_sprint.sh` (or closest) — add scenarios:
  1. v2 close with prep script succeeding → close proceeds normally.
  2. v2 close with prep script failing (mock by removing required input) → close exits 1 with `Step 3.5 FAILED` message.
  3. v2 close with prep script succeeding but writing <2KB bundle → close exits 1 (size check).
  4. v1 close with prep script failing → close proceeds with warning (regression baseline).
- `cleargate-cli/test/scripts/test_token_ledger_hook.sh` — add scenario: simulate Reporter SubagentStop with delta totals over each threshold; assert correct warning lines.
- `cleargate-cli/test/scripts/test_prep_reporter_context.sh` (or new) — golden-snapshot test: against a fixture sprint with known shape, prep script produces a `.reporter-context.md` matching golden output. **This is the diagnostic for §0.5 Q5** — running it against a markdown_file_renderer-shaped fixture will reveal why the test folder didn't get a bundle.

**Out of scope:**

- Reporter prompt rewrite for output STYLE (just for input scope). Report sections + tone unchanged.
- Token-ledger off-by-one fix — that's CR-035, separate but adjacent.
- Per-story session_id reset for dev+qa loops — broader concern, would need orchestrator surgery; file as CR-039-suggested if cost reduction here proves it's needed too.
- Cost-per-section instrumentation (which §N cost the most output tokens) — over-optimization; defer.

## 4. Verification Protocol

**Acceptance:**

1. **Bundle is generated for the test repro.** Run `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-01` against the markdown_file_renderer test folder. Either it succeeds (bundle written, ≥2KB) — surface as v0.10.0 silent-skip diagnostic flashcard — OR it surfaces a real bug → fix the bug as part of this CR's scope.
2. **v2 close hard-blocks on bundle absence.** Mock a sprint with `execution_mode: v2` and a forced prep failure. `close_sprint.mjs` exits 1 with `Step 3.5 FAILED` block.
3. **v1 close stays non-fatal.** Same mock with `execution_mode: v1`. Close proceeds, stderr warning emitted.
4. **Reporter prompt forbids source reads.** Manual review of `.claude/agents/reporter.md`: no language about "fall back to source files" remains in the bundle-present path. Escape-hatch env documented.
5. **Token budget warning fires.** Simulate a Reporter SubagentStop row with `delta.cache_read = 250000`. Hook emits `⚠️ Reporter token budget exceeded: 250,000 > 200,000` to stdout.
6. **Token budget advisory + flashcard fires.** Same with `delta.cache_read = 600000`. Hook emits warning + appends a flashcard line.
7. **End-to-end re-test.** Reset the markdown_file_renderer test folder. Re-run a small sprint (single story). Verify:
   - Bundle generated at close.
   - Reporter dispatch total < 200k tokens (assert via post-close ledger inspection).
   - Report quality: 6 sections present, length within 80%-120% of pre-CR baseline.
   - No source-file reads logged in the Reporter's own session.
8. **Scaffold mirror diffs empty.** `diff` returns empty for all 4 file pairs.

**Test commands:**

- `bash .cleargate/scripts/test/test_close_sprint.sh` — green.
- `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-01` against test folder → diagnose silent-skip.
- Manual smoke: end-to-end sprint in fixture, observe Reporter SubagentStop ledger row total.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-036): reporter token diet — bundle mandatory, no source fallback, fresh session, budget warn`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard; if §0.5 Q5 diagnostic surfaced a separate bug in prep_reporter_context.mjs, file as BUG-NNN.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (Step 3.5 non-fatality, Reporter fallback permissiveness, session inheritance, no budget check).
- [x] All impacted downstream items identified (v1 fallback preserved; quality regression mitigated by golden-snapshot test).
- [x] Execution Sandbox names exact files + line refs + sample diff.
- [x] Verification with 8 acceptance scenarios + 3 test files.
- [ ] **Open question:** Step 3.5 fatality severity (§0.5 Q1).
- [ ] **Open question:** Source-file fallback removal scope (§0.5 Q2).
- [ ] **Open question:** Fresh session_id mechanism (§0.5 Q3).
- [ ] **Open question:** Token budget assertion thresholds (§0.5 Q4).
- [ ] **Open question:** prep script silent-skip diagnostic — fold or split (§0.5 Q5).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q6).~~ Resolved 2026-05-03: SPRINT-21 (W3).
- [ ] `approved: true` is set in the YAML frontmatter.
