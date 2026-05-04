# CR-050 DevOps Report — Path B Caller Migration + Shim Removal

**Story:** CR-050
**Merge SHA:** see git log on sprint/S-24
**Story branch:** story/CR-050 (deleted; was 7078663)
**State transition:** Done
**Operator:** orchestrator-fallback (devops subagent_type still not registered — same as CR-049/052/051; CR-051 escape-hatch documented for SPRINT-25)

## Required reports

| Report | Status |
|---|---|
| CR-050-dev (acceptance signal) | ✓ |
| CR-050-qa.md | ✓ (PASS, 7/7; SCOPE_DRIFT: new-helper-out-of-M1-but-justified) |
| CR-050-arch.md | ✓ (APPROVED; helper was IN scope per M1 sketch step 3; just renamed) |

## Actions

1. `git merge story/CR-050 --no-ff` — auto-merge clean.
2. **Mirror parity (CR-049 sentinel + CR-050 surface):**
   - run_script.sh: live = canonical ✓ (both 205 LOC post-shim-removal)
   - 4 SPRINT-23 known scripts: live = canonical ✓ (CR-049 hold)
3. `cd cleargate-cli && npm run prebuild && npm run build` — payload + dist refreshed.
4. **CLI smoke** (the headline acceptance for this CR): `node cleargate-cli/dist/cli.js sprint preflight SPRINT-24` ran through the gate-check pipeline without 127-ing on script paths. (Output reported pre-existing mid-sprint errors — sprint branch exists, main dirty — those are expected; the load-bearing observation is that NO production caller died on the bare `<script-name>.{mjs,sh}` form.)
5. Worktree removed; story branch deleted; state → Done.

## Sprint-goal advancement

Goal clause: "retire the run_script.sh back-compat shim by migrating production CLI callers". **Delivered.** 8 callers across 4 src files (sprint.ts, state.ts, gate.ts, story.ts) now pass `node`/`bash` + absolute path explicitly. Shim block deleted from both run_script.sh files lockstep. `resolveCleargateScript` helper at `src/lib/script-paths.ts` keeps call sites short.

## TPV signal — fourth + final operational dispatch

CR-050 TPV: APPROVED. **SPRINT-24 final tally: 0/4 BLOCKED-WIRING-GAP returns.**

Architect post-flight notes: "Single-sprint zeros aren't a robust signal; recommend keeping TPV in SPRINT-25 for a larger sample." Per CR-047 §0.5 Q4 follow-through: 0 catches → DOWNGRADE to fast-lane-skip is a candidate decision but Architect recommends 1 more sprint of data before pulling. Track for Reporter §5 metrics.

Per Architect: "TPV did its wiring-layer job correctly. Single-sprint zeros aren't robust." Decision deferred to next sprint or to human.

## CR-052 helper utilization

Architect noted: "CR-052 ROI in SPRINT-24 ended up smaller than projected — wrapScript consumed by its own meta-tests + the shim-removal sentinel only; the 8 caller tests bypassed it." Dev created spawnFn-arg-capture caller tests instead of wrapScript-driven ones — same regression-protection signal but less leverage on CR-052's helper. Future caller tests should consume wrapScript per CR-052's intent.

## Flashcards flagged

- `2026-05-04 · #cr-050 #wrapper #migration · story.ts had 2 undocumented run_script.sh callers (story bouncing + done); CR-050 §2 said 6 callers, commit migrated 8 — always grep story.ts alongside sprint/state/gate when auditing wrapper call-sites.`
- `2026-05-04 · #wrapper #helper-leverage · spawnFn-arg-capture caller tests provide regression-protection equivalent to wrapScript-driven tests but bypass the e2e helper; document the canonical pattern for SPRINT-25.`
