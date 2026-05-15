# CR-064 · SPRINT-27

```
STORY: CR-064
QA: PASS
TYPECHECK: pass (per Dev report; pack absent — verified via commit 247b380 stat: clean)
TESTS: 20 passed, 0 failed (CR-064 Red scope); 197 passed pre-existing suite (17 pre-existing CR-046/CR-052/CR-054 Red failures — unrelated, unchanged)
ACCEPTANCE_COVERAGE: 8 of 8 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
```

WARN: QA context pack absent (`.cleargate/sprint-runs/SPRINT-27/.qa-context-CR-064.md` not found). Verification performed via direct commit + worktree source inspection. Confidence: high (all artifacts directly readable in worktree at 247b380). SCHEMA_INCOMPLETE does not apply — this is a pack-absent case, not legacy format.

## DEVIATION_VERDICTS

- **path-validator-first: ACCEPT**
  Deviation is correct. SPRINT_RUNS_PATH_REGEX check runs at `push.ts:182` BEFORE `readFile` at the former line 195. This guarantees exit 2 (path-rejection code) for non-allowlisted sprint-runs/ paths. Pre-deviation: parseFrontmatter would exit 1 (frontmatter error) for `.jsonl` files, producing wrong exit code and masking the reason. Deviation aligns with §4 Scenario 4/5/6 exit-code assertions (all assert exit 2). No spec conflict.

- **granular-trycatch: ACCEPT**
  Steps 7.4a and 7.4b each have their own try/catch at `close_sprint.mjs:771-780` and `close_sprint.mjs:787-796`. Outer catch at `close_sprint.mjs:803-806` remains as belt-and-suspenders. This is strictly additive: 7.4a failure now does not block 7.4b (e.g. plan push fails but report push still runs). Non-fatal semantics unchanged. Deviation matches M3 plan intent ("each sub-step is independently non-fatal").

## EPIC_027_PROOF_LOOP_CLOSED: yes

Evidence:
1. `mcp/src/lib/payload-contract.ts` KNOWN_TYPES (line 21-22) contains both `'sprint'` and `'sprint_report'`.
2. `cleargate-cli/src/commands/push.ts` typeMap includes `sprint_id: 'sprint'` (line 438).
3. `getItemTypeWithPathOverride` exported and maps SPRINT_REPORT_PATH_REGEX paths to `'sprint_report'` (line 455-461).
4. Path validator guards sprint-runs/ with exit 2 for non-allowlisted paths (lines 182-193), BEFORE readFile.
5. `close_sprint.mjs` Step 7.4 literal `// CR-064: mcp push sprint plan + report` at offset < `// CR-063: wiki ingest sprint report` — ordering confirmed in both live + canonical mirrors (diff empty = parity).
6. Prebuild npm-payload (`cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs`) also byte-identical (three-way diff empty).
7. Smoke script `cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs` exists, shebang `#!/usr/bin/env node` on line 1, contains `CLEARGATE_SMOKE_DRY_RUN` dry-run support, checks `warnings|unknown_type` regex and emits `warnings: []` suppression confirmation, emits `4 pushed, 0 failed` aggregate.
8. No `unknown_type` warning fires for `type=sprint` or `type=sprint_report` because KNOWN_TYPES includes both — smoke script structural assertion verified by source grep.

## Gherkin → Test Mapping (push-sprint-types)

| Scenario | §4 Criterion | Test |
|---|---|---|
| S1 | sprint_id frontmatter → type "sprint" | push-sprint-types S1 it block |
| S2 | SPRINT-NN_REPORT.md path → "sprint_report" | push-sprint-types S2 |
| S3 | legacy REPORT.md → "sprint_report" | push-sprint-types S3 |
| S4 | token-ledger.jsonl → exit 2 | push-sprint-types S4 |
| S5 | plans/M1.md → exit 2 | push-sprint-types S5 |
| S6 | .script-incidents/foo.json → exit 2 | push-sprint-types S6 |
| S7 | sprint plan H1 title fallback | push-sprint-types S7 |
| S8 | sprint report H1 title fallback | push-sprint-types S8 |

## Gherkin → Test Mapping (close_sprint.mjs + smoke)

| Scenario | §4 Criterion | Test |
|---|---|---|
| close S1 | CR-064 anchor in live + canonical | close-sprint-step-7-4 S1 (2 it blocks) |
| close S2 | anchor offset < CR-063 offset (ordering) | close-sprint-step-7-4 S2 (2 it blocks) |
| close S3 | mirror parity live ↔ canonical | close-sprint-step-7-4 S3 (1 it block) |
| close S4 | prebuild payload has anchor | close-sprint-step-7-4 S4 (1 it block) |
| smoke S1 | script exists + shebang | smoke-push-sprint-artifacts S1 (2 it blocks) |
| smoke S2 | invocable (no ENOENT) / dry-run | smoke-push-sprint-artifacts S2 (1 it block) |
| smoke S3 | warnings assertion + sprint_report + "4 pushed" | smoke-push-sprint-artifacts S3 (3 it blocks) |

## VERDICT

Ship it. All 8 Gherkin acceptance scenarios are covered by 20 passing tests across 3 Red test files. Both plan deviations are beneficial and spec-compliant. Three-way mirror parity (live ↔ canonical ↔ npm-payload) confirmed by diff. EPIC-027 proof loop is closed: `KNOWN_TYPES` contains both target types, push.ts wires them correctly, smoke script asserts `warnings: []`, close_sprint.mjs ordering is locked (Step 7.4 MCP-push before Step 7.5 wiki-ingest). QA context pack was absent; all assertions performed against commit 247b380 worktree files directly.

## FLASHCARDS_FLAGGED

```yaml
flashcards_flagged:
  - "2026-05-15 · #path-validator #exit-code · path-validator must run BEFORE readFile+parseFrontmatter to guarantee exit 2 (not 1) for non-allowlisted paths"
  - "2026-05-15 · #mirror #parity #three-way · sprint-critical scripts need three-way parity check: live + canonical + npm-payload (diff returns empty for all three pairs post-prebuild)"
```
