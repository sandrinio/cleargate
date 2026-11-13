role: qa
# BUG-121 QA-Red — the repo's gate commands win (U2, HEAD 302e60f, uncommitted)

QA-RED: WRITTEN
BASELINE_FAIL: 20 of 21 cases in gate-commands-kept (1 guard green: fresh init prints no line); 1 of 1 BUG-121 integration case. BUG-122 and BUG-120 describes stay green on a scratch build of HEAD (3/3 pass).

Files (worktree-relative, /Users/ssuladze/Documents/Dev/cg-wt/u2):
- test/commands/gate-commands-kept.red.node.test.ts (new)
- test/commands/upgrade-field-path.red.integration.node.test.ts (appended describe('BUG-121'))

Red cases and why:
- Sc1 upgrade --yes / init keep make check / make lint: baseline replaces them with go test ./... / go vet ./... (and prints `re-applied repo test stack:`).
- Sc2 qa.test "" filled + announced: baseline also replaces qa.typecheck, and prints no `[upgrade] gate-checks.json:` line.
- Sc3 ./run-tests.sh kept through init and upgrade (no stack): baseline blanks it to "".
- Sc4 dry run: no `[dry-run] gate-checks.json: …` line.
- Units planGateCommands (4), formatGateChanges (2), readGateCommands (1): exports missing (dynamic import, asserted per case).
- Units applyTestStack: returns void / explicit prior ignored; two-arg form overwrites a non-empty file; user-formatted file is rewritten.
- init output: changed field -> exact `[cleargate init] gate-checks.json: …` line replacing Skipped (exists): missing; "nothing changed" case reds because values get replaced; --force keeps prior + line after Overwritten: missing; user-formatted file byte-identical: rewritten.
- Integration: built CLI init then upgrade --yes on a Go repo: `upgrade keeps qa.test` fails (go test ./...). Also asserts the `[upgrade] gate-checks.json:` line, the removal of the old line, and a re-run of init keeps them.

Green on baseline (guard): fresh init prints no gate-checks.json line and detects go test ./....

Notes:
- upgradeHandler's injected stdout receives lines without trailing newline; the file joins them with '\n'. init's stdout strings carry '\n'.
- Existing tests unchanged; typecheck clean. BUG-037's upgrade-preserves-gate-commands and init-test-stack-detect F6 not edited (need to stay green after the fix: they use empty-file two-arg applyTestStack).
- Scratch build was /tmp/cgb.* from `git archive HEAD`, removed afterwards. No commit made.

flashcards_flagged: []
