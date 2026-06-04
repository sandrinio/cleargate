---
cr_id: CR-078
parent_ref: EPIC-045
parent_cleargate_id: EPIC-045
sprint_cleargate_id: "SPRINT-65"
carry_over: false
status: Completed
approved: true
area: framework/sprint-loop
context_source: |
  Live dogfood observation of the new_app (Chyro) orchestrator running SPRINT-66
  under execution_mode: v2-parallel — findings F1 + F2 in
  .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md (lines 25-48).
  F1: init_sprint.mjs never writes the .active sentinel at kickoff; after SPRINT-66
  kickoff .active still read SPRINT-65 and the orchestrator hand-fixed it (verified:
  init_sprint.mjs has ZERO .active references; sprint.ts:810 only TRUNCATES it at
  close). F2: every fresh story defaults to lane:'standard' (init_sprint.mjs:160
  `lane: carry.lane ?? 'standard'`), so SDR §2.4-designated fast lanes (114-03,
  117-04) had to be hand-reclassified. Both were orchestrator-fixed live; the
  Hour-1 Synthesis confirms the .active hand-fix held end-to-end (ledger66 1→15,
  ledger65 flat at 292 — no misattribution once corrected). Codebase-grounded
  2026-06-03 against the live scripts + SKILL. Routes to EPIC-045 (sprint-loop
  hygiene) per the dogfood-findings triage directive.
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:35:24Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:15.057Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-078
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-03T16:35:24Z
  sessions: []
push_version: 1
---

# CR-078: init_sprint.mjs sets the `.active` sentinel at kickoff and applies the SDR lane audit

## 0.5 Open Questions

- **Question:** Where do lane assignments authoritatively live for init to ingest — the structured `plans/waves.json` (which `launch_wave.mjs` already consumes) or a parse of the Sprint Plan §2.4 Lane Audit prose? `waves.json` is produced by the planning workflow (STORY-033-03) and is machine-readable; the §2.4 Lane Audit is human-authored markdown.
- **Recommended:** Read lanes from `plans/waves.json` if present (single machine-readable source already in the loop), and fall back to parsing the Sprint Plan §2.4 Lane Audit table only when `waves.json` is absent. Treat `waves.json` as canonical to avoid a second prose-parser; log a WARN (not a hard fail) when neither source declares a lane for a story so init stays runnable on a bare sprint with no §2.4.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** Should writing `.active` be idempotent / guarded when a *different* non-empty sprint is already active (e.g. `.active` reads `SPRINT-65` and you init `SPRINT-66`)? Silently overwriting matches the SKILL §A.3 contract but could mask an un-closed prior sprint.
- **Recommended:** Overwrite unconditionally (the SKILL §A.3 contract says init owns the flip) but emit a one-line WARN to stderr when the prior `.active` value is non-empty AND differs from the sprint being initialised (`WARN: .active was SPRINT-65, overwriting with SPRINT-66 — prior sprint may not have been closed`). Honors the contract, surfaces the un-closed-sprint hazard, never blocks. The write itself stays atomic (tmp + rename), mirroring the existing `state.json` write at `init_sprint.mjs:179`.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- The belief — stated verbatim in sprint-execution SKILL §A.3 (`.claude/skills/sprint-execution/SKILL.md:152`) — that `init_sprint.mjs` "flips `.cleargate/sprint-runs/.active` to `SPRINT-NN`". **It does not.** `init_sprint.mjs` contains ZERO references to `.active`; it writes `state.json` only (atomic tmp+rename at line 179). No production code anywhere writes a non-empty sprint-id into `.active` at kickoff — the `cleargate sprint` CLI (`cleargate-cli/src/commands/sprint.ts:810`) only ever TRUNCATES `.active` to `""` at sprint *close*. Only test fixtures set it. So the SKILL §A.3 claim is a documented contract with no implementation behind it.
- The assumption that fresh stories carry their SDR-designated lane. `init_sprint.mjs:160` sets `lane: carry.lane ?? 'standard'` and only carries a lane forward for *carry-over* stories — every brand-new story is forced to `standard` (`lane_assigned_by: 'migration-default'`). The SDR §2.4 Lane Audit / `plans/waves.json` lane designations are never read at init.

**New Logic (The New Truth):**
- `init_sprint.mjs` atomically writes `SPRINT-NN` to `.cleargate/sprint-runs/.active` as its final step, honoring the SKILL §A.3 contract. This is the single place that sets the sentinel; `sprint.ts:810` remains the single place that clears it at close. With this in place the token-ledger router (`write_dispatch.sh:64-74`) and the SessionStart banner read the correct sprint with no hand-fix.
- `init_sprint.mjs` ingests lane assignments from the SDR §2.4 Lane Audit / `plans/waves.json` and applies them to each story's `lane` in `state.json` (with `lane_assigned_by: 'sdr-lane-audit'` instead of `'migration-default'`). Stories with no declared lane keep the `standard` default. Fast-lane stories no longer require manual reclassification post-init.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Update SKILL prose: `.claude/skills/sprint-execution/SKILL.md:152` — its claim becomes true once F1 lands; verify the wording still matches the implemented behavior (and document the lane-ingest step in §A so the manual `cleargate story lane …` workaround is no longer the documented path).
- [ ] **Relates to CR-071 (not a duplicate):** CR-071 *reads* the `.active` sentinel; this CR is what finally *sets* it at kickoff. CR-071 consumes the contract CR-078 establishes — they are complementary, not overlapping. Coordinate sequencing so CR-071's reader assumes a kickoff-populated sentinel.
- [ ] Canonical/live sync: `init_sprint.mjs` and the SKILL live under `.cleargate/scripts/` and `.claude/skills/` which have `cleargate-planning/` mirrors — canonical edit + manual re-sync of the live `/.claude/` and the npm payload per the Dogfood-split rule.
- [ ] Database schema impacts? No — this is sprint-loop orchestration (sentinel file + `state.json` lane field) only; no `mcp/`, `admin/`, or DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the live meta-repo checkout.

- **Surface:** `.cleargate/scripts/init_sprint.mjs:160` — builds each story's `state.json` entry with `lane: carry.lane ?? 'standard'` (only carry-over stories keep a lane; fresh stories all default `standard`). Writes `state.json` atomically at line 179 and contains ZERO `.active` references. This is the file both F1 and F2 fix.
- **Surface:** `.cleargate/scripts/write_dispatch.sh:64-74` — reads the `.active` sprint sentinel as the token-ledger routing key and errors if it is empty; the downstream consumer that misattributes ledger rows when the sentinel is stale (F1 consequence).
- **Surface:** `.claude/skills/sprint-execution/SKILL.md:152` — the §A.3 prose that falsely asserts init "flips the `.active` sentinel to `SPRINT-NN`"; the contract this CR implements (and whose wording must be reconciled).
- **Surface:** `cleargate-cli/src/commands/sprint.ts:810` — Step 6 of sprint close, the ONLY production write to `.active` today (a truncate to `""`); confirms no kickoff write exists and bounds the new write so the two stay symmetric.
- **Why this CR extends rather than rebuilds:** `init_sprint.mjs` already owns kickoff state setup (it writes `state.json` and sprint-context atomically) and already has a `lane` field per story; this CR adds two final/inline steps to that existing flow — set the sentinel and source lanes from the SDR — rather than authoring a new init path. The `.active` write reuses the file's established tmp+rename atomic-write idiom (line 179); the lane ingest reuses the existing `waves.json` artifact that `.cleargate/scripts/launch_wave.mjs` already reads.

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify:**
- `.cleargate/scripts/init_sprint.mjs` — (a) add a final atomic write of `SPRINT-NN` to `.cleargate/sprint-runs/.active` (tmp+rename, mirroring line 179); (b) before building the `stories` map (around line 150-164), read lane assignments from `plans/waves.json` (fallback: Sprint Plan §2.4 Lane Audit) and use them in place of the hard `'standard'` default, stamping `lane_assigned_by: 'sdr-lane-audit'`.
- `.claude/skills/sprint-execution/SKILL.md` — reconcile the §A.3 line 152 wording with the now-implemented `.active` flip; document the lane-ingest step in §A so manual reclassification is no longer the documented path.

**Mirror after canonical edit (re-sync, do not hand-diverge):**
- `cleargate-planning/.cleargate/...` and `cleargate-planning/.claude/...` counterparts + live `/.claude/` via `cleargate init` per the Dogfood-split rule.

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test:**
- `.active` write: in a scratch sprint dir, `node .cleargate/scripts/init_sprint.mjs SPRINT-99 --force` then `cat .cleargate/sprint-runs/.active` returns `SPRINT-99` (was empty/stale before).
- Regression that old behavior is gone: `grep -n "\.active" .cleargate/scripts/init_sprint.mjs` now returns at least one match (was zero); `node -e "require('node:assert').equal(require('fs').readFileSync('.cleargate/sprint-runs/.active','utf8').trim(),'SPRINT-99')"`.
- Lane ingest: seed `plans/waves.json` (or a §2.4 Lane Audit) marking one story `fast`, run init, then `node -e "const s=require('./.cleargate/sprint-runs/SPRINT-99/state.json'); require('node:assert').equal(s.stories['STORY-XXX-YY'].lane,'fast'); require('node:assert').equal(s.stories['STORY-XXX-YY'].lane_assigned_by,'sdr-lane-audit')"` — passes; a story with no declared lane still reads `standard`.
- Add a `*.node.test.ts` under the script's test surface asserting both behaviors (sentinel written == sprint-id; declared fast lane applied; undeclared defaults standard), run via `node --test --import tsx/esm`.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood findings and verified codebase grounding.

**context_source:** SPRINT-66 dogfood observations F1 + F2 (`.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md:25-48`) + 2026-06-03 codebase grounding (`init_sprint.mjs:160`/:179 zero-`.active`; `write_dispatch.sh:64-74`; `SKILL.md:152`; `sprint.ts:810`; `launch_wave.mjs` waves.json consumer). Routes to EPIC-045 sprint-loop hygiene. Relates to (does not duplicate) CR-071 which reads the sentinel this CR sets.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 evicts the false SKILL §A.3 "init flips .active" claim and the unconditional `lane: 'standard'` default, each cited to a verified line.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Epic/Story depends on this leaf fix; the only cross-item coupling is CR-071 (reads the sentinel this CR sets), flagged in §2 as relates-not-dup. Nothing to revert.*
- [x] Execution Sandbox contains exact file paths. — *§3 names `init_sprint.mjs` and `SKILL.md` with the specific edit per file plus the canonical-mirror targets.*
- [x] Verification command is provided. — *§4 gives concrete `node init_sprint.mjs` + `cat .active` + state.json lane assertions and a regression grep.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Dogfood finding filed for triage; approval is a separate Gate-1 step pending the §0.5 decisions (waves.json-vs-§2.4 source, idempotent-write guard).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Four verified paths cited with line numbers: `init_sprint.mjs:160`, `write_dispatch.sh:64-74`, `SKILL.md:152`, `sprint.ts:810`.*