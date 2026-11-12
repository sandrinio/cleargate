# STORY-063-12 QA-Verify (role: qa)

STORY: STORY-063-12
VERDICT: PASS
Mode: VERIFY, trial merge 7494449 (main d7c5fa2 incl. 11-F2 + story/STORY-063-12 4a994b9), TMPDIR short.

## Commands run (trial12) and results
- `npm run typecheck`: exit 0.
- Five 12 files, one `node --test --import tsx/esm --test-concurrency=1`: 215 tests, 215 pass, 0 fail, 0 skipped (137 s).
- 11-F2 / session-brief tests (grep for startReleaseLookup|provablyNoTags|printSessionBrief -> session-brief-f2.red, doctor-session-brief-f2.red) plus the other session-brief / doctor-session-brief files: 177 pass, 0 fail.
- Static oracle checks: `git ls-files -s` mode 100755; line 19 `export LC_ALL=C`; the G-M2-32 regex (cleargate|node|npx|tsx|cleargate-cli|dist/|src/) matches nothing in brief-oracle.sh; `jq required` check at line 23; raw-marker refusal (exit 2) at line 72 with no bare ` cleargate ` word.
- Outer repo `git status --porcelain .cleargate/delivery`: identical before and after (diff empty).
- Not run, as instructed: full npm test, live eval, any build.

## Coverage
| Item | Code | Test | Result |
|---|---|---|---|
| Gherkin 1 (brief agrees, both variants, no CLI refs) | brief-oracle.sh compare | brief-truth-oracle R3 + oracle static test + corpus A/B | pass |
| Gherkin 2 (planted carried removal -> `mismatch: carried`, exit 1; jq missing -> "jq required", no skip) | compare, line 23 | R3 + oracle files | pass |
| Gherkin 3 (12 sessions, hook has Active sprint, evidence per answer, PASS rule, smoke label) | orientation-eval.mjs `computeVerdict`, `evaluateTranscript`, `renderEvidence` | eval red file (57) | pass (live run deferred, by design) |
| Gherkin 4 (baseline `--version 0.28.0`, no pass bar) | `computeVerdict` baseline branch; npm install path | eval units | pass |
| Gherkin 5 (no claude / timeout -> not run, INCOMPLETE, non-zero) | `run()` never pre-checks claude; exit 3 | eval units | pass |
| R1 oracle independence, R2 compare/`+N more`/exit codes (G-M2-71/72/73), R3, R4 corpus | script + corpus | oracle 60, edges 73, R3 15, corpus 10 | pass |
| R5 driver + 12-question file (8 brief, 4 page), R6 scoring + tool_use counter (Skill excluded, recorded), R7 verdict (>=11, 8 brief at zero tools), R8 baseline, R9 gating model | eval + questions.json | eval units | pass |
| Amendments: validateContainer first (line 382), `--ref main` default, `--version` path, precedence INCOMPLETE>BASELINE>SMOKE>PASS/FAIL, spawn count (Dev: 9, E9 pins <=40 and constant) | present | edges E9 | pass |

Spawn-count and bash 3.2 / BSD awk were verified via the tests and the Dev's notes (E-series), not on a separate macOS-bash-3.2 binary; this host is darwin, so /usr/bin/awk is BSD awk and the tests exercised it.

## Deviation 4 (active_sprint token)
Confirmed: the sealed red 'a clean brief session' (orientation-eval.red.node.test.ts:210-221) answers 'The active sprint is SPRINT-9.' with FACTS_A and asserts correct === true, so a token requiring "4 stories" would fail that red. The Dev's token is the ID before " — ". Weakening: small. An answer naming SPRINT-9 without the story count passes, so the story §1.5 mitigation (ID plus a count) is not applied to this one question. Mitigating: the SessionStart hook_response must still contain the real `Active sprint:` line (hook gate, injection proof), 11/12 tolerates one miss, and the evidence file records the full answer for the §2.2 spot-check. Not a blocker; recommend noting in the release spot-check. WARN only.

## Other checks
- No machine paths, usernames or emails in orientation-eval.mjs, orientation-questions.json, brief-oracle.sh (grep clean); corpus guard test also asserts this for the tree.
- Questions fixture: 8 brief (keys active_sprint, last_closed, carried, planned, waiting, p0p1, decisions, release) + 4 page with fixed tokens.
- Task Breakdown rows unchecked in the story file; the baseline-run row is a manual step (advisory, not a bounce).

## Defects
none.

## flashcards_flagged
- 2026-11-12 · #qa #oracle · A token-containment gate that must pass a sealed red can silently drop the story's count-token mitigation; check reds before trusting §1.5.
