# U5 QA (BUG-126) — QA: PASS
Worktree cg-wt/u5, story/BUG-126, red 9c68aaa, fix 5e627a3, base b9fe36a. Scratch build: /tmp/cgb.CK1p (build exit 0).

## Diff vs G-R-41..44
- src diff = only src/lib/wiki/contradict.ts, src/commands/wiki-contradict.ts. No scaffold/agent file changed. `git diff 9c68aaa..5e627a3 -- test` empty.
- phase4 JSON keys unchanged (draftId, draftWikiPath, neighborhood, truncated, ingestSha, prompt); pageless draftWikiPath = raw abs path.
- Prompt line 2 = `Draft raw file (bucket "<bucket>" is not in wiki.ingest_buckets, so it has no wiki page): <abs raw>` (matches plan).
- Included bucket: epic phase4 output base dist vs 5e627a3 build, paths normalised -> byte IDENTICAL (cmp). Included bucket with missing page still fails (red test passes).
- isPagelessDraft: config throw => ingestable.

## Commands (fresh shell)
- npm run typecheck: exit 0.
- Default tier (pass/fail/skip): excluded-bucket.red 8/0/0; contradict-commit.red 31/0/0; contradict-cli 13/0/1 (skip = pre-existing `skip: !IS_E2E` at :516); unchecked-drafts.red 36/0/0; build-sprint-reports 12; decisions-page 44; decisions-unit 88; ingest-docs-match-code 28; emit-context 9; doctor-contradiction-alarm 14; codex-hooks-harness 91 — all 0 fail.
- Built CLI (CLEARGATE_BUILT_CLI=/tmp/cgb.CK1p/dist/cli.js): excluded-bucket.red.integration 2/0; stamp-and-gate-context.red.integration 19/0; contradict-commit-cli.red.integration 6/0.

## §5 scenario map
1. Story checked from raw file -> excluded-bucket.red "Sc1 ... phase4 prompt names the raw file" (+ integration). PASS
2. Result recorded on raw file -> Sc2 (exit 0, raw stamped, no page; findings still in contradictions.md) (+ integration). PASS
3. Checked story not checked again -> Sc3 (skipped: sha-idempotent sha=<8>; body edit re-opens). PASS
4. Included bucket unchanged -> Sc4 (page + raw both stamped) + missing-page failure + stories re-added edge. PASS
MISSING: none.
Note (from qa-red): the literal "No contradictions found." is rejected by parseFindings (exit 1); tests use the real subagent output `contradiction-check: no findings`. Pre-existing parser behaviour, unchanged; bug text's sentence is not what the subagent emits.

## Edge probes (built CLI, temp repos)
- config.yml with no ingest_buckets key: story -> page path/prompt, identical to base (today's behaviour). OK.
- Malformed config.yml: story -> page path, identical to base. OK.
- Explicit default list (no stories): story -> raw path + new prompt (fix).
- Stale `last_contradict_sha: "deadbeef"` on raw: contradict emits phase4; commit exit 0 re-stamps to the real hash; next contradict prints `skipped: sha-idempotent sha=acc577cc`. OK.

## Findings (not blockers; outside §5, alarm is "do not modify")
F1. The stamp-and-gate.sh `🔎 contradiction check pending` line derives from the `phase4:` line printed by `wiki ingest`; for an excluded bucket ingest prints `skipped (bucket 'stories' not in wiki.ingest_buckets)` with no phase4 line (repro: `wiki ingest <story file>` in default-config repo). So the hook never prompts the check for a story draft; the check only runs if the agent follows CLAUDE.md unprompted.
F2. `unchecked-drafts.ts:48` skips non-ingestable buckets, and reads `page.last_contradict_sha` (:62) only. So `doctor --session-start` never alarms for an unchecked story draft (probe: edited stamped story, no alarm). The raw stamp that BUG-126 now writes is read by nothing but `wiki contradict`'s own idempotency. Consistent with the bug's "Do NOT modify the unchecked-draft alarm"; candidate follow-up CR.

Script incidents: none.
