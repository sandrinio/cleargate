---
cr_id: CR-077
parent_ref: EPIC-045
parent_cleargate_id: "EPIC-045"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: framework/portability
context_source: |
  SPRINT-66 dogfood observation log (live watch of the new_app/Chyro orchestrator
  running SPRINT-66 under execution_mode v2-parallel — a polyglot pytest-backend +
  vitest-frontend target). Findings F3 + F6, plus the F3 confirmation note in the
  Hour-1 Synthesis. Source artifact:
  .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md (F3 lines
  50-69; F6 lines 323-324; F3-confirmed-with-evidence lines 304/308).
  Evidence: (F3) the shipped agents hardcode ClearGate-internal "node:test mandatory
  / vitest forbidden (EPIC-028)" as universal law — on Chyro the agents wrote
  *.red.node.test.tsx files and ran them through vitest; sprint_context.md has no
  structured test-stack field so the orchestrator had to hand-populate the real
  stack into freeform Cross-Cutting Rules. (F6) gate-checks.json hardcodes
  arch/qa.typecheck = `cd cleargate-cli && npm run typecheck`, which ALWAYS FAILs in
  any non-meta target (no cleargate-cli dir) — a permanent false-FAIL the
  orchestrator learned to treat as noise. F3/F6 are the highest-impact findings —
  they block any non-node target out of the box. Contradicts the stated
  "general-purpose, ships to many repos" goal (memory project_codemap_general_purpose).
  Routes to EPIC-045 framework-portability per owner direction.
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
  last_gate_check: 2026-06-03T16:32:10Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:14.167Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
---

# CR-077: Repo-derive test-runner conventions + gate commands; stop shipping ClearGate-internal node:test/vitest-forbidden policy as law

## 0.5 Open Questions

- **Question:** How should the target's test stack be discovered — (a) detected at `cleargate init` from the target tree (e.g. `pytest`/`pyproject.toml`, `vitest`/`package.json`, `go test`/`go.mod`) and written into the shipped agent text + `gate-checks.json` at install time; (b) read from a structured authoritative `test_stack` block in `sprint_context.md` that agents treat as overriding their defaults; or (c) BOTH?
- **Recommended:** BOTH, layered. (a) `cleargate init` writes a best-effort `test_stack` block (runner cmd, red-test naming, typecheck cmd) from a detector so a fresh install is correct out-of-the-box; (b) the `sprint_context.md` `test_stack` block is the runtime authority and agents read it as overriding their built-in defaults, so a polyglot/mis-detected target is fixable per-sprint without re-init. (c) The shipped agent text becomes neutral/parametric (no hardcoded runner) and defers to the block. This is the only combination that survives both the fresh-install case and the polyglot case (Chyro = pytest backend + vitest frontend, which a single detected runner cannot capture).
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** How do we keep the meta-repo's OWN real policy ("node:test mandatory / vitest forbidden — EPIC-028") while shipping neutral agents to targets — separate canonical-vs-payload agent text, or one parametric template that the meta-repo fills with its own node:test stack?
- **Recommended:** One parametric template, single source. Keep `cleargate-planning/.claude/agents/*.md` runner-neutral (it reads `test_stack` from `sprint_context.md`); the meta-repo's own `test_stack` block (in its sprint contexts / a repo-level default) carries `node:test` + `*.red.node.test.ts` + `check:no-vitest`. This avoids a second canonical-vs-payload divergence on top of the existing live/canonical/payload split — the EPIC-028 policy moves from agent-instruction prose into the meta-repo's own data, where it belongs, and the shipped agents stop asserting it as universal. Forking the agent text into "meta version" vs "shipped version" is rejected: it triples the dogfood-sync surface that already bit us (BUG-024).
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** Backstop for an undetected/unconfigured stack — if `init` cannot detect a runner and no `test_stack` block is set, do agents fail loud or fall back to a default?
- **Recommended:** Fail loud at the gate, not silently default to node:test. Emit a one-line "test_stack unresolved — populate sprint_context.md §Test Stack" warning from the pre-gate scan and treat the typecheck/test gate as advisory (not FAIL) until populated, rather than running a wrong-runner command that produces F6-style permanent noise.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- The shipped Developer agent declares `node:test` the *"single, mandatory runner across all ClearGate packages (EPIC-028)"* and that *"vitest is fully eliminated; adding it back is forbidden and blocked by the `check:no-vitest` pre-commit guard,"* with hardcoded `tsx --test … 'test/**/*.node.test.ts'` commands for `mcp/`+`cleargate-cli/` and `*.node.test.ts` naming. This is ClearGate-INTERNAL policy (true only of the meta-repo since EPIC-028, 2026-05-18) being shipped to every target as universal law. STOP treating it as universal.
- The shipped QA agent hardcodes red-test naming `*.red.node.test.ts` and the `cleargate gate test` command; the Architect TPV gate checks `*.red.node.test.ts` naming. STOP asserting node:test file extensions on a target that uses pytest/vitest/go test.
- `gate-checks.json` hardcodes `arch.typecheck`, `qa.typecheck`, and `qa.test` to `cd cleargate-cli && npm run typecheck` / `npm test`. STOP shipping the meta-repo's own package path as the gate command — in any target without a `cleargate-cli/` directory this command ALWAYS FAILs (F6: a permanent false-FAIL the Chyro orchestrator had to learn to ignore as noise).
- `sprint_context.md` has no structured place for a target's test stack — its Cross-Cutting Rules are freeform `(rule 1)` stubs and Locked Versions lists only Node/TS. STOP relying on the orchestrator hand-populating the real stack into freeform prose where the agent's own hardcoded `.md` instructions out-rank it.

**New Logic (The New Truth):**
- Test-runner conventions (runner command, red-test naming convention, typecheck command) are **repo-derived**, not framework-dictated. They are detected at `cleargate init` from the target (pytest / vitest / go test / …) and/or read from an authoritative `test_stack` block in `sprint_context.md` that agents treat as **overriding** their built-in defaults.
- The shipped agent payload (`developer.md`, `qa.md`, `architect.md`) is runner-neutral: it references "the project's test runner / red-test naming as declared in `sprint_context.md` §Test Stack" rather than naming `node:test` / `*.node.test.ts` / `tsx --test`.
- ClearGate-internal "vitest forbidden / node:test mandatory (EPIC-028)" wording is **stripped from the shipped agent payload** and lives only as data in the meta-repo's own `test_stack` configuration.
- `gate-checks.json` `typecheck`/`test` commands are repo-derived at `init`, not shipped as `cleargate-cli` literals.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update parent Epic: **EPIC-045** (framework portability) — this CR is the F3+F6 portability defect within it; the Epic's scope statement must list "shipped agents/gate-config assume node:test / cleargate-cli paths" as in-scope.
- [ ] Update shipped agent payload: `cleargate-planning/.claude/agents/developer.md`, `.../qa.md`, `.../architect.md` (and their `cleargate-cli/templates/cleargate-planning/.claude/agents/**` mirror, auto-rewritten by `npm run prebuild`).
- [ ] Update `cleargate-planning/.cleargate/scripts/gate-checks.json` + the live `.cleargate/scripts/gate-checks.json` (dogfood-split re-sync required — canonical edit does not auto-propagate to live).
- [ ] Update `cleargate-planning/.cleargate/templates/sprint_context.md` (+ live mirror) to add a structured `## Test Stack` block.
- [ ] Update `cleargate-cli/src/init/copy-payload.ts` (or an adjacent init step) to run a stack-detector and write the derived `test_stack` + `gate-checks.json` commands at install. **Cross-repo:** `cleargate-cli/` is its own git repo (gitignored here) — this part ships via a CLI release, separately from the `.cleargate/`/`.claude/` payload edits.
- [ ] **Overlap flag:** shares the "shipped-config hardcodes meta-repo paths" root cause with F1/F2 init-gaps and F8 (`run_script.sh` env) — coordinate if EPIC-045 batches the init-rewrite so two CRs don't both edit `copy-payload.ts` / `init_sprint.mjs`.
- [ ] Database schema impacts? No — agent-instruction text, gate-config JSON, a template section, and an init-time detector only. No `mcp/`/`admin/`/DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the meta-repo tree. Line numbers cite the canonical tracked copies (the live `/.claude/**` mirror is gitignored/per-machine and carries identical content).

- **Surface:** `cleargate-planning/.claude/agents/developer.md:83` — declares node:test the "single, mandatory runner across all ClearGate packages (EPIC-028)" and vitest "forbidden … blocked by `check:no-vitest`"; `:85` hardcodes `*.node.test.ts` naming; `:88` hardcodes the `tsx --test … 'test/**/*.node.test.ts'` run command. This is the primary leak — ClearGate-internal policy shipped as universal.
- **Surface:** `cleargate-planning/.claude/agents/qa.md:43` (and `:47`, `:52`) — RED-mode hardcodes failing-test naming `*.red.node.test.ts`; `:103` and `:109` hardcode `cleargate gate test`.
- **Surface:** `cleargate-planning/.claude/agents/architect.md:110` + `:116` — the TPV gate receives "list of `*.red.node.test.ts` files" and verifies "Test files end in `*.red.node.test.ts`" — node:test naming baked into the wiring gate.
- **Surface:** `cleargate-planning/.cleargate/scripts/gate-checks.json:4` + `:7` + `:10` — `qa.typecheck`, `qa.test`, and `arch.typecheck` all hardcode `cd cleargate-cli && npm run typecheck` / `npm test`; F6's permanent false-FAIL in any non-meta target originates exactly here.
- **Surface:** `cleargate-planning/.cleargate/templates/sprint_context.md` — `## Locked Versions` lists only Node/TS and `## Cross-Cutting Rules` are freeform `(rule 1)` stubs; there is NO structured test-stack field, which is why the orchestrator's stack info had to live in prose less authoritative than the agents' hardcoded `.md`.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` (own repo, gitignored here) — the init payload copier (SKIP_FILES at line ~54); the new init-time stack-detector + `test_stack`/`gate-checks.json` rewrite is the natural extension point here (or an adjacent init step).
- **Why this CR extends rather than rebuilds:** the agent payload, gate-config, sprint-context template, and init copier all already exist and function for the meta-repo's own node:test stack; this CR makes them runner-neutral + repo-derived (detect-at-init + a `sprint_context.md` override block), it does not author a new agent loop or a new gate engine. The detector is the only genuinely new code (declared as a creation in §3).

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify:**
- `cleargate-planning/.claude/agents/developer.md` — replace the node:test/vitest-forbidden block + hardcoded run commands with a parametric reference to `sprint_context.md` §Test Stack.
- `cleargate-planning/.claude/agents/qa.md` — replace `*.red.node.test.ts` naming + `cleargate gate test` literals with the declared red-test naming + gate command.
- `cleargate-planning/.claude/agents/architect.md` — TPV reads the declared red-test naming instead of `*.red.node.test.ts`.
- `cleargate-planning/.cleargate/scripts/gate-checks.json` — `typecheck`/`test` become repo-derived placeholders (resolved at init), not `cd cleargate-cli` literals.
- `cleargate-planning/.cleargate/templates/sprint_context.md` — add `## Test Stack` (backend runner, frontend runner, typecheck cmd, red-test naming convention).
- (re-sync) live `/.claude/agents/*.md`, `/.cleargate/scripts/gate-checks.json`, `/.cleargate/templates/sprint_context.md` — via `cleargate init` or hand-port (dogfood-split rule).

**Create:**
- A stack-detector invoked at `cleargate init` (in/adjacent to `cleargate-cli/src/init/copy-payload.ts`) that inspects the target tree (`pyproject.toml`/pytest, `package.json`/vitest, `go.mod`/go test, …) and writes the derived `test_stack` block + `gate-checks.json` commands. (Own-repo `cleargate-cli/`; ships via CLI release.)

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test:**
- **Eviction grep (shipped payload is neutral):** `grep -rniE "node:test|vitest|check:no-vitest|node\.test\.ts|tsx --test|cleargate-cli" cleargate-planning/.claude/agents cleargate-planning/.cleargate/scripts/gate-checks.json cleargate-planning/.cleargate/templates/sprint_context.md` returns ZERO matches (the EPIC-028 policy and the `cleargate-cli` literals are gone from the shipped surface).
- **Detector unit test (run from `cleargate-cli/`):** `tsx --test 'test/**/init-test-stack-detect.node.test.ts'` exits 0 — asserts: a pytest fixture dir → typecheck/test derived as pytest; a vitest fixture dir → vitest; a polyglot fixture (pytest backend + vitest frontend) → both runners captured in the `test_stack` block; an undetectable fixture → unresolved sentinel (not a node:test default).
- **F6 regression (no false-FAIL in a non-meta target):** after `cleargate init` in a temp non-node fixture (`mktemp -d`, no `cleargate-cli/`), `gate-checks.json`'s `arch.typecheck`/`qa.typecheck` do NOT contain `cd cleargate-cli`; the gate runs the detected command (or emits the advisory "test_stack unresolved" line) rather than exit-127.
- **Meta-repo self-check (own policy preserved):** the meta-repo's own resolved `test_stack` still carries `node:test` + `*.red.node.test.ts` + `check:no-vitest`; `npm test` in `cleargate-cli/` stays green.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log and recorded owner direction to route portability findings to EPIC-045.

**context_source:** SPRINT-66 dogfood observation log — `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` findings **F3** (lines 50-69: shipped agents hardcode node:test-mandatory/vitest-forbidden as universal; `sprint_context.md` lacks a structured test-stack field) + **F6** (lines 323-324: `gate-checks.json` ships `cd cleargate-cli && npm run typecheck`, always FAILs in non-meta targets), with the **F3-confirmed-with-evidence** note (lines 304/308: Chyro's vitest frontend forced agents to write `*.red.node.test.tsx` under node:test naming, run through vitest — "works, not clean"). Verified codebase grounding: `developer.md:83-91`, `qa.md:43/47/52/103/109`, `architect.md:110/116`, `gate-checks.json:4/7/10`, `sprint_context.md` (no test-stack field), `cleargate-cli/src/init/copy-payload.ts`. Contradicts memory `[[project_codemap_general_purpose]]` (general-purpose, ships to many repos). Owner-directed routing to EPIC-045.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 names the four exact leaks (developer.md node:test block, qa/architect red-test naming, gate-checks.json `cd cleargate-cli`, sprint_context.md missing test-stack field) with cited lines.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Story depends on this leaf portability fix yet (EPIC-045 not yet decomposed). Parent EPIC-045 flagged in §2; the cross-CR overlap with the init-rewrite (F1/F2/F8) is noted. Nothing to revert.*
- [x] Execution Sandbox contains exact file paths. — *§3 lists each Modify path + the one Create (init detector) with the cross-repo `cleargate-cli/` caveat.*
- [x] Verification command is provided. — *§4 gives the eviction grep, a detector unit test, the F6 non-meta-target regression, and the meta-repo self-check.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Surfaced from dogfood observation; approval is a separate Gate-1 step pending the §0.5 forks (detect-at-init vs sprint-context block vs both; single parametric template vs canonical-vs-payload fork).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Six verified surfaces cited; new detector declared as a §3 creation, not in Existing Surfaces.*
