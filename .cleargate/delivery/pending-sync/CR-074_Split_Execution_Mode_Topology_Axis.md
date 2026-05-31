---
cr_id: CR-074
parent_ref: EPIC-044
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
area: framework/hygiene
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
  last_gate_check: 2026-05-31T22:15:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-074
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T22:15:22Z
  sessions: []
---

# CR-074: Split the residual `execution_mode` topology axis out of the retired enforcement token

## 0.5 Open Questions

- **Question:** Should the parallel-wave toggle become a sprint-frontmatter field (`wave_mode: serial | parallel`) or env-only (`CLEARGATE_PARALLEL_WAVES=on|off`)?
- **Recommended:** Env-only. Topology is an operator/run-time decision, not a planning property; keeping it out of frontmatter avoids re-introducing a forgettable per-sprint field with an unsafe default. The serial path stays the safe default.
- **Human decision:** {populated during Brief review}

- **Question:** Default when neither toggle is set?
- **Recommended:** Serial (current behaviour — `shouldRunParallel` returns false unless `v2-parallel`). Fail-safe to the simpler topology.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `execution_mode` is NOT a live concept. STORY-070-01 (commit `b87f6ac0`) retired its **enforcement** meaning (`v1`/`v2`) — gates are now always enforced, with `CLEARGATE_ADVISORY=1` (`cleargate-cli/src/util/gate-mode.ts:isAdvisory()`) as the sole break-glass. `state.schema.json` is v3 and no longer stores `execution_mode`.
- Stop treating `execution_mode` as a single field. It was overloaded: one token carried two orthogonal axes — **enforcement strength** (retired) and **execution topology** (serial vs parallel waves).

**New Logic (The New Truth):**
- The topology axis gets its own honest name and lives in exactly one place. `shouldRunParallel()` (`.cleargate/scripts/launch_wave.mjs:137-140`) reads that toggle instead of `execution_mode`.
- `SKILL.md` and `sprint-execution` prose stop branching on `execution_mode` for enforcement entirely (any residual `v1`/`v2` enforcement reads are removed — the always-enforced behaviour is the only behaviour). The §C.0 kill-switch table is rewritten in terms of the topology toggle only.
- One token → one meaning → one store. After this CR, `grep -rn 'execution_mode'` over the live scaffold returns only the topology selector's deprecation shim (if any) and archived/historical references.

## 2. Blast Radius & Invalidation

- [ ] Update `.cleargate/scripts/launch_wave.mjs` — `shouldRunParallel(executionMode, env)` signature/semantics (reads the new toggle; `execution_mode` arg deprecated).
- [ ] Update `.claude/skills/sprint-execution/SKILL.md` §C.0 / §C.0.1 — kill-switch + parallel-wave selection prose (currently keyed on `execution_mode: v2-serial | v2-parallel`).
- [ ] Update `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical mirror) + payload mirror + live `/.claude` (canonical → payload → live, BUG-024 class).
- [ ] Audit `.cleargate/scripts/*.mjs` + `cleargate-cli/src/**` for any remaining `execution_mode` enforcement read (STORY-043-01 + SKILL cleanup in SPRINT-33 already remove the known ones; this CR catches the residue).
- [ ] Database schema impacts? No — no `mcp/`, `admin/`, or DB surface touched. State is `state.json` (schema v3, already migrated).

## 2.5 Existing Surfaces

- **Surface:** `.cleargate/scripts/launch_wave.mjs:137` — `shouldRunParallel(executionMode, env)` returns `false` unless `executionMode === 'v2-parallel'` (and `CLEARGATE_PARALLEL_WAVES !== 'off'`); the live topology selector.
- **Surface:** `cleargate-cli/src/util/gate-mode.ts:isAdvisory()` — the retained, correct enforcement break-glass (`CLEARGATE_ADVISORY=1`); CR-074 does NOT touch this — it is the model the topology axis should imitate (single explicit lever).
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §C.0 — kill-switch table still phrased as `execution_mode: v2-serial | v2-parallel`; the prose to rewrite.
- **Why this CR extends rather than rebuilds:** The enforcement collapse (STORY-070-01) already established the pattern — retire the conflated field, replace with a single explicit lever. This CR applies the same surgery to the *second* axis that the first pass left behind; it removes a token meaning, it does not build new dispatch machinery (that is EPIC-044's domain).

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/launch_wave.mjs`
- `.claude/skills/sprint-execution/SKILL.md` (+ canonical `cleargate-planning/.claude/...`, payload, live)
- (audit-only, edit if residue found) `.cleargate/scripts/*.mjs`, `cleargate-cli/src/**`

## 4. Verification Protocol

**Command/Test:**
- `grep -rn "execution_mode" .cleargate/scripts .claude cleargate-cli/src cleargate-planning --exclude-dir=archive --exclude-dir=node_modules` returns no *enforcement* read and no `v2-serial|v2-parallel` topology read (only the new toggle + any documented shim).
- New unit test: `shouldRunParallel` honours the new topology toggle (serial default; parallel only when explicitly enabled; `off` kill-switch wins).
- Regression: a `v2-parallel` run still fans out; a serial/unset run still runs the five-dispatch loop unchanged (kill-switch parity).

---

> **Deferral note (SPRINT-33 SDR, 2026-06-01):** Filed as a follow-up while executing SPRINT-33. The topology axis is **dormant** (parallel waves are not used in SPRINT-33 — it runs serial), so this is deliberately NOT in SPRINT-33 scope. Natural home is EPIC-044 (Agent Dispatch Reliability & Token Efficiency). Prior work: [[STORY-070-01]] (enforcement-axis collapse, the pattern to mirror), [[CR-070]] (its planning artifact), [[EPIC-044]] (parent). Left in Draft — not pushed.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(EPIC-044 not yet approved; revisit at EPIC-044 planning.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter. *(intentionally Draft — follow-up for a later sprint.)*
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
