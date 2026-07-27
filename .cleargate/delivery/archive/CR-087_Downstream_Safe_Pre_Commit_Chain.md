---
cr_id: CR-087
parent_ref: CR-086
parent_cleargate_id: CR-086
sprint_cleargate_id: SPRINT-38
carry_over: false
area: framework/enforcement
status: Completed
approved: true
context_source: SPRINT-38 shipping review 2026-07-27 (workflow wfdakdjhq — 24 agents over real npm tarballs 0.10.0-0.17.1, 16 findings confirmed / 0 refuted; A/B measured on identical repo state) + CR-086 Architect post-flight carry-over CR-A + direct human approval to fix in-sprint before close
created_at: 2026-07-27T00:00:00Z
updated_at: 2026-07-27T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-27T22:21:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-087
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-27T22:21:47Z
  sessions: []
---

# CR-087: Make the shipped pre-commit chain safe in a downstream repo

## 0.5 Open Questions

- **Question:** Delete the `check:no-vitest` chain from the shipped hook, or guard it?
- **Recommended:** Guard it. Deleting removes a real EPIC-028 protection in the meta-repo, where the check is meaningful and passing today. Guarding keeps enforcement exactly where the target packages exist and makes it inert — not fatal — everywhere else.
- **Human decision:** RESOLVED — guard (orchestrator, 2026-07-27).

- **Question:** The prefix list `mcp | cleargate-cli | admin` is hard-coded meta-repo vocabulary in a file that ships to every target repo. Should this CR make it configurable?
- **Recommended:** No — guard now, generalise later. Making the list config-driven is the [[EPIC-045]] portability class (F3/CR-077 territory) and needs a config-schema decision. This CR is a publish-blocker fix and must stay small enough to land before close.
- **Human decision:** RESOLVED — guard only; the hard-coded list becomes a named carry-over (orchestrator, 2026-07-27).

- **Question:** Should `-s` be dropped even though it makes hook output noisier on the happy path?
- **Recommended:** Yes. `-s` is precisely why the failure is undiagnosable: zero bytes on stdout *and* stderr, no hook name, nothing to grep. Noise on failure is the point; the happy path stays quiet because the guard means the command is not run at all where it cannot succeed.
- **Human decision:** RESOLVED — drop `-s` (orchestrator, 2026-07-27).

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that this hook is harmless because "it has never fired." It has been byte-identical since 0.13.0 and inert **only** because every published dispatcher resolved `HOOK_DIR` to `.git/hooks/` and globbed nothing. [[CR-086]] fixed the dispatcher, which arms it.
- Forget that `SKIP_SURFACE_GATE=1` is an escape hatch here. The failure happens at `pre-commit-surface-gate.sh:26`, *before* any surface-gate logic reads that variable. Measured: it does not help. Only `--no-verify` does, which CLAUDE.md forbids outright.
- Forget that a non-zero `npm --prefix` on a missing directory is a loud error. With `-s` it emits **zero bytes** on both streams; the user sees a bare `exit 1` from `git commit`.

**New Logic (The New Truth):**
- Each `check:no-vitest` invocation runs only when its prefix directory exists **and** that directory's `package.json` actually defines the script. A prefix that fails either test is skipped — not failed.
- When a check does run and fails, it prints. No `-s`.
- A repo with none of the three directories — i.e. every real downstream repo — commits cleanly with the full ClearGate hook chain wired.
- This is proven by a test that wires the hook the documented way in a downstream-shaped scratch repo and runs a real `git commit`.

## 2. Blast Radius & Invalidation

- [x] **Completes [[CR-086]]** (merged `d8733937`), which armed this. No gate reset: CR-086's own acceptance is unaffected, and its Architect post-flight named this exact follow-up as carry-over "CR-A".
- [x] **Unblocks the next `npm publish`.** Publishing today ships a silent commit-blocker to every repo that followed the `ln -sf … .git/hooks/pre-commit` instruction — including a fresh clone of `sandrinio/cleargate`.
- [x] **Meta-repo behaviour must not weaken.** All three directories exist here and the check passes today; after this CR it must still run and still block on a real vitest reintroduction. A test asserting "downstream commits cleanly" that also silently disarms the meta-repo would be a failed fix.
- [ ] Database schema impacts? **No.**
- **Not invalidated:** the other nine SPRINT-38 items. This touches one line of one hook plus its test.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh:26` — the `if ! npm run check:no-vitest -s --prefix mcp || ! … --prefix cleargate-cli || ! … --prefix admin; then exit 1; fi` chain. Measured exit shapes: no `mcp/` → 254; root `package.json` but no `mcp/` → 254; `mcp/` present without the script → 1; npm absent → 127. **No downstream repo shape passes.**
- **Surface:** `cleargate-planning/.claude/hooks/pre-commit.sh:16-25` — CR-086's symlink-chain walk; the change that makes the above reachable.
- **Surface:** `cleargate-cli/package.json` — defines `check:no-vitest`; the meta-repo's `mcp/`, `cleargate-cli/` and `admin/` all define it today, which is why the check passes here.
- **Surface:** `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` — CR-086's end-to-end harness. It builds a scratch repo, installs the dispatcher the documented way, and drives real `git commit`s. **The new test extends this pattern rather than inventing a second harness.**
- **Why this CR extends rather than rebuilds:** the hook chain, its dispatcher, and its e2e harness all landed correctly hours ago. One line inside one wrapper assumes a repo layout that only the meta-repo has. The fix is a guard plus a test proving the assumption is gone.

## Prior work

- [[CR-086]] — **created** this exposure by fixing the dispatcher; its post-flight named the fix as carry-over "CR-A" but deliberately left it out of scope. This CR discharges it.
- [[EPIC-045]] — polyglot portability; finding F3 covers the same *class* (scaffold surfaces hard-coding meta-repo structure) but targets agents and `gate-checks.json`, not the pre-commit chain. Adjacent, not overlapping.
- [[STORY-051-01]], [[STORY-051-02]] — `file_surface_diff.sh` internals and the ratchet-hook retirement; neither touches the surface-gate wrapper.
- `.cleargate/FLASHCARD.md` 2026-07-27 `#danger #gate` records the hazard and the "fix before publish" instruction.
- No prior filed work item covers this defect. Confirmed via `cleargate-wiki-query` 2026-07-27 plus a grep of `.cleargate/delivery/archive/`.

## 3. Execution Sandbox

**Modify (canonical, then hand-port to the live-root twin by diff — never blind `cp`):**
- `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` — guard each prefix; drop `-s`.

**Add (cli repo, branch `sprint/S-38`):**
- Extend `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` with a downstream-shape cluster, **or** add `cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts` if the Architect judges the existing file better left immutable. Architect's call, recorded in the plan.

**Do NOT touch:** `pre-commit.sh` (CR-086's, correct as landed) · `file_surface_diff.sh` · the gitignored live `/.claude/**` (Gate-4 hand-port) · `MANIFEST.json` / `cleargate-cli/templates/**` / `dist` (prebuild is DevOps's step) · the hard-coded prefix list itself, beyond guarding it · any other SPRINT-38 work item.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test` — the new/extended scaffold test must be picked up by the default glob and pass.

Assertions:
1. **Downstream repo commits cleanly.** Scratch git repo with **no** `mcp/`, `cleargate-cli/` or `admin/`, hook wired via `ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit`; a plain `git commit` exits **0** and HEAD advances. *Red today: exits 1 with zero output.*
2. **Diagnosable failure.** When a check does run and genuinely fails, stderr is non-empty and names the failing check. *Red today: `-s` guarantees zero bytes.*
3. **Meta-repo enforcement intact.** In a fixture where a prefix directory exists **and** defines `check:no-vitest` **and** that script fails, the hook still exits non-zero.
4. **Partial shapes are skipped, not failed.** Directory exists but no `package.json`; `package.json` exists but no `check:no-vitest` script — both skip and let the commit through.
5. **No new bypass.** `SKIP_SURFACE_GATE=1` remains the only documented bypass; the guard introduces no new `SKIP_`-style token.

**Old-logic eviction check:** `grep -n 'check:no-vitest' cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` must show no unguarded invocation and no `-s` flag on it.

---

## Context Source

**context_source:** SPRINT-38 shipping review 2026-07-27 (workflow `wfdakdjhq`: 24 agents, real npm tarballs 0.10.0–0.17.1 unpacked and installed in scratch repos, 16 findings confirmed / 0 refuted). Finding B1 was A/B measured on identical repo state — published-0.17.1 dispatcher → `git commit exit=0`; CR-086 dispatcher → `exit=1`, `stdout bytes: 0`, `stderr bytes: 0`, HEAD unchanged — and line 26 isolated as the sole blocker by stubbing it out and observing the gate exit cleanly with its normal warning. Human chose "fix P1 in-sprint, close after" over closing with a publish freeze, 2026-07-27.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified — CR-086 is completed (not reset), the publish path is unblocked, and the meta-repo's own enforcement is called out as a must-not-weaken constraint.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
