# STORY-066-15 QA-Verify (role: qa)

QA: PASS
Worktree: .worktrees/STORY-066-15/cleargate-cli, ef9edba over 25144f3, base ad5110c.

- typecheck: pass (exit 0). prebuild (incl. build-codex-payload.mjs --check): pass.
- prep-reporter-lanes.red + prep-reporter-measured-metrics.red: 15/15 pass.
- 13 related files (reporter-content x2, reporter-measured-metrics.red, autonomy-contract, loop-spec-three-paths, scripts-fence-bug098, status-vocab-phase-b, close-sprint-hardening-043-05, test_prep_reporter_context, test_close_sprint_v21, smoke-push-sprint-artifacts, foreign-repo, template-stubs): 287 pass, 10 fail.
- The 10 failures, all in suite-after-STORY-066-12.txt (rule 18 / baseline) except one:
  - foreign-repo Scenario 1, 2 (baseline; fail in the base tree too).
  - template-stubs: Sprint Plan Template live===mirror (x2), story.md live===mirror (rule 18, listed).
  - test_close_sprint_v21 Scenario 10 (3 assertions), Scenario 24: in the 066-12 suite evidence (baseline).
  - NEW KNOWN RED: template-stubs "sprint_report.md: live === mirror" and parent "Mirror parity for both templates (STORY-025-04)". It passed in suite-after-066-12. Cause: this story edits canonical sprint_report.md while live is frozen (rule 11); the story's §1.5 predicted it. Needs a sprint §6 / rule-18 entry. Goes green after the Gate 4 re-sync.
  - Note: the S46-sandbox base worktree gives a different (much larger) failure set on these files because of its layout; I used the 066-12 suite evidence as the base reference.
- Surface: ef9edba touches only prep_reporter_context.mjs, templates/sprint_report.md, reporter.md, reporter.toml (all in §3.1). No `*.red.*` file in ef9edba. The red file is in 25144f3 only.
- Probe (copy of sandbox .cleargate in a scratch dir under the worktree, deleted afterwards; the worktree script was copied over it): bundle `## Measured Metrics` shows
  By lane: fast — 1 items, 1 dispatches, 1 per item. / standard — 2 items, 14 dispatches, 7 per item. / runtime — 1 items, 7 dispatches, 7 per item.
  Rework by defect location: code 3, red-test 1, spec 0, unknown 0.
  These match `sprint_metrics.mjs SPRINT-01 --json` by_lane and totals.rework_by_defect_in. The table, Totals and First-pass lines are unchanged.
- Side effect to disclose: running the sandbox's `sprint_metrics.mjs --json` rewrote the sandbox's tracked `SPRINT-01/metrics.json`; I restored it with `git checkout` (sandbox status is back to the two pre-existing untracked entries).
- Observation (not a defect of this story): the rework "red-test 1" brings by-defect to 4, against "3 rework rounds" in Totals. That comes from sprint_metrics (STORY-066-10 / S4 / 066-13 territory), out of scope.

Gherkin: Outline (both Examples; the sealed red covers them), Sc2 existing lines unchanged (sealed measured-metrics red green), Sc3 prompt/template/toml rows (red green; the toml generated and --check passes). 3 of 3.
Task Breakdown rows: detached host; the orchestrator ticks (rule 20).
