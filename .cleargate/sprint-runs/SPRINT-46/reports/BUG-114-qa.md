# BUG-114 QA-Verify (role: qa)
QA: PASS. Worktree HEAD 9954d54; global cleargate on PATH = /opt/homebrew/lib/node_modules/cleargate/dist/cli.js (0.30.1), ambient PATH.
- typecheck: clean. node --check close_sprint.mjs: ok.
- New red solo: 4/4 (T1 local, T2 prefix PATH symlink, T3 wrapper, T4 local wins).
- Witness list: hardening-043-05 16/16, step-2-6c.red 7 pass 1 skipped (pre-existing superseded-by-BUG-083 skip), 2-6c-archive 2/2, backsync 11/11, assume-ack-guard 19/19, fence.red 4/4, step-7-4.red 5/5, wiki-ingest-sprint-report.red 14/14, reporter-measured-metrics 5/5, sprint 5/5, sprint-unit 11/11, doctor-drift-guard 13/13. Canonical shell bug076_077_close_path.red.sh 8/8.
- hermeticPath() counts 5,1,1,1,1,1 (as planned).
- Integration: three live-parity reds (rule 11, plan s4): close-sprint-step-2-6c.live, step-7-4.live, wiki-ingest-sprint-report.live: only the byte-identical parity test fails in each. test_close_sprint_v21: S10 + S24 (4 sub-tests) = baseline. close-sprint-reconcile "clean sprint": baseline.
- Proof run: evidence/BUG-114/proof-global-layout.txt. Base script exits 1 "cleargate CLI dist not found"; fixed script prints the D-3 line naming the PATH dist + 0.30.1, passes 2.6d/2.6c/2.6/2.6b/2.7-2.9, stops at "Waiting for Reporter" exit 0 (no report, so the Gate-4 prompt itself is not reached; the plan's pass criteria are met). Scratch dir removed.
- Surface: ad5110c..9954d54 = 8 cli test/seal files + helper + new red + canonical bug076 shell + close_sprint.mjs; 9954d54 touches only close_sprint.mjs. Live twin and outer shell test unchanged.
Finding (not BUG-114): baseline-red close-sprint-reconcile.integration spawns the outer host's live close_sprint.mjs against the real tree and, as a side effect, moves EPIC-058/EPIC-061 from pending-sync to archive in the outer host. I restored both with git checkout/rm; outer host and cli worktree now porcelain-empty.
