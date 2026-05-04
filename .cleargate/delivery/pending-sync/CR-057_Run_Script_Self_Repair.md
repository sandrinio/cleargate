---
cr_id: CR-057
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
  CR-046 §0.5 Q3 (SPRINT-23) deferred run_script.sh self-repair to a
  future CR. Rationale: "self-repair without observed failure data
  is speculative scope." The plan was to ship capture+report first
  (CR-046), let SPRINT-23 + SPRINT-24 generate an incident corpus,
  THEN design self-repair targeted at the patterns that actually
  recurred.

  SPRINT-24 generated `.cleargate/sprint-runs/SPRINT-24/.script-
  incidents/*.json` — at least 3 incident files visible at session
  end. SPRINT-23's incidents (if any) live in
  `.cleargate/sprint-runs/SPRINT-23/.script-incidents/`.

  CR-057 has 2 phases:
  1. INVESTIGATE: read every `.script-incidents/*.json` across
     SPRINT-23 + SPRINT-24. Tally failure patterns by command +
     exit_code + stderr signature. Build a frequency table.
  2. ACT: pick the top 1-3 recurring patterns + ship targeted
     self-repair logic OR document "no recurring pattern; defer
     self-repair indefinitely".

  Self-repair pattern shape per CR-046 §0.5 Q3 alternative tight-
  scope proposal: hard-coded retry list, 3 known-flaky patterns,
  max 1 retry, no logic past that. Scope-cut floor: if investigation
  shows no recurring pattern, ship NOTHING in run_script.sh; just
  document findings. CR-057 may scope-cut to docs-only.

  Self-repair candidates from past flashcards (priori-likely):
  - npm install network blip (transient ECONNRESET)
  - git lock file (.git/index.lock)
  - stale lockfile cleanup (package-lock.json conflict)
  - macOS realpathSync (already mitigated in CR-052; not wrapper concern)

  Investigation determines which (if any) actually appear in the
  incident corpus.
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: .cleargate/sprint-runs/SPRINT-23/.scrip, .cleargate/sprint-runs/SPRINT-24/.scrip"
  last_gate_check: 2026-05-04T18:39:53Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-057
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:39:53Z
  sessions: []
---

# CR-057: run_script.sh Self-Repair (Incident-Corpus-Driven)

## 0.5 Open Questions

- **Question:** Investigation budget?
  - **Recommended:** ≤ 30 min Dev investigation. Read all `.cleargate/sprint-runs/*/.script-incidents/*.json` files (probably <20 total). Tally by command + exit_code + stderr signature. Document in findings report. If <3 recurring patterns (each ≥2 occurrences), scope-cut to docs-only per Open Q3.
  - **Human decision:** _populated during Brief review_

- **Question:** Self-repair scope cap?
  - **Recommended:** hard cap. Maximum 3 retry patterns, max 1 retry per pattern, max 60s total wall-clock budget per invocation. If a pattern needs more retries (e.g., flaky CI race), it's not a self-repair pattern — it's a deeper bug to file as a separate CR.
  - **Human decision:** _populated during Brief review_

- **Question:** Scope-cut to docs-only — what's the docs deliverable?
  - **Recommended:** if no recurring patterns found, write `.cleargate/knowledge/script-incident-corpus-analysis.md` summarizing the corpus + reasons no self-repair was added. Update CR-046 §0.5 Q3 status: "deferred — see CR-057 findings; revisit when corpus exceeds N incidents".
  - **Human decision:** _populated during Brief review_

- **Question:** Self-repair invocation — env-flag opt-in OR default-on?
  - **Recommended:** default-on for known patterns. Self-repair is bounded (max 1 retry, max 60s). Env-flag bypass: `RUN_SCRIPT_NO_REPAIR=1` for tests / debugging. Logs the retry attempt to incident JSON regardless (so observability isn't lost).
  - **Human decision:** _populated during Brief review_

- **Question:** Should self-repair logic live in run_script.sh OR a sibling script?
  - **Recommended:** sibling. Add `_run_script_self_repair.sh` (or `.mjs`) that run_script.sh sources OR calls. Keeps run_script.sh under 250 LOC; self-repair logic isolated for testing. If sibling becomes complex, that's a hint the pattern doesn't belong in self-repair — file as separate CR.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- run_script.sh fails on the first non-zero exit; orchestrator/agent re-dispatches manually.
- Speculative self-repair plans without incident-corpus data.

**New Logic (The New Truth):**
- run_script.sh applies bounded self-repair for the top N recurring failure patterns observed in SPRINT-23 + SPRINT-24 corpus. Hard caps: max 3 patterns, max 1 retry each, max 60s total.
- Every retry attempt is logged to incident JSON (observability preserved).
- `RUN_SCRIPT_NO_REPAIR=1` env-flag bypasses for tests.
- If investigation shows no recurring patterns: NO code change; document corpus analysis in knowledge doc; scope-cut to docs-only.

## 2. Blast Radius & Invalidation

**If real patterns found (CODE-MODE):**
- [ ] **`.cleargate/scripts/_run_script_self_repair.sh`** (or `.mjs`) — NEW. Self-repair logic for top N patterns. ~50 LOC.
- [ ] **`.cleargate/scripts/run_script.sh`** — call self-repair sibling on non-zero exit. ~10 LOC additive.
- [ ] **Canonical mirrors** — both files mirrored to `cleargate-planning/.cleargate/scripts/`.
- [ ] **`cleargate-cli/test/scripts/run-script-self-repair.red.node.test.ts`** — NEW. N+1 scenarios: each pattern retries once + bypass via env-flag.
- [ ] **`cleargate-cli/src/lib/script-incident.ts`** — extend `ScriptIncident` interface with optional `retry_attempt: number` field. Update JSDoc.
- [ ] **Investigation findings report** at `.cleargate/sprint-runs/SPRINT-25/script-incident-corpus-analysis.md`.

**If scope-cut to docs-only (DOCS-MODE):**
- [ ] **`.cleargate/knowledge/script-incident-corpus-analysis.md`** — corpus tally + reasons no self-repair shipped + revisit-trigger ("when corpus exceeds N incidents per pattern").
- [ ] **No run_script.sh change.**
- [ ] **Update CR-046 §0.5 Q3 status note** OR cite this CR-057 in cleargate-protocol.md.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/run_script.sh` — current wrapper, no self-repair.
- **Surface:** `.cleargate/sprint-runs/SPRINT-23/.script-incidents/` + `.cleargate/sprint-runs/SPRINT-24/.script-incidents/` — incident corpus.
- **Surface:** `cleargate-cli/src/lib/script-incident.ts` — ScriptIncident interface.
- **Surface:** `cleargate-cli/test/helpers/wrap-script.ts` (CR-052) — helper for any new self-repair tests.
- **Why this CR extends rather than rebuilds:** wrapper exists; incident schema exists. CR-057 either adds bounded self-repair logic OR documents-and-defers. No infrastructure rebuild.

## 3. Execution Sandbox

**Investigate:**
- Read `.cleargate/sprint-runs/*/.script-incidents/*.json` files
- Tally by command + exit_code + stderr signature
- Document in findings report

**Modify (CODE-MODE only):**
- run_script.sh + canonical mirror
- script-incident.ts (interface extension)

**Add (CODE-MODE only):**
- _run_script_self_repair.sh sibling
- Red test
- Findings report

**Add (DOCS-MODE):**
- knowledge doc with corpus analysis

**Out of scope:**
- Self-repair patterns beyond top 3 (CR-058+candidate)
- Multi-retry logic (>1 retry per pattern)
- Time-budget tuning beyond the 60s cap
- Refactoring run_script.sh beyond self-repair integration

## 4. Verification Protocol

**Acceptance (CODE-MODE):**
1. Findings report tallies incident corpus + identifies top 1-3 recurring patterns (each ≥2 occurrences across SPRINT-23 + SPRINT-24).
2. `_run_script_self_repair.sh` (or .mjs) implements bounded self-repair: max 3 patterns, max 1 retry each, max 60s total.
3. run_script.sh calls self-repair sibling on non-zero exit; preserves all existing behavior on success.
4. ScriptIncident interface gains optional `retry_attempt` field; JSDoc updated.
5. NEW Red test passes N+1 scenarios.
6. RUN_SCRIPT_NO_REPAIR=1 bypass works.
7. Mirror parity: live = canonical for both wrapper + self-repair sibling.

**Acceptance (DOCS-MODE):**
1. Findings report at `.cleargate/sprint-runs/SPRINT-25/script-incident-corpus-analysis.md` documents:
   - Total incident count.
   - Failure-pattern tally with exit_code + stderr signature.
   - Reason for no-self-repair decision (e.g., "no pattern recurred ≥2×").
   - Revisit-trigger threshold ("when corpus exceeds 20 incidents OR any single pattern exceeds 5 occurrences").
2. CR-046 §0.5 Q3 status note added OR cleargate-protocol.md cites CR-057 findings.
3. No code changes shipped.

**Both modes:**
- `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- (CODE-MODE) `cd cleargate-cli && npm test -- test/scripts/run-script-self-repair.red.node.test.ts`
- (Both) `find .cleargate/sprint-runs/*/.script-incidents -name "*.json" | wc -l` to count corpus.

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch (per CODE-MODE / DOCS-MODE branch).
- [x] §4 Verification Protocol has testable acceptance for both modes.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — investigation + potential code addition).
- [ ] Investigation determines CODE-MODE vs DOCS-MODE.

---
