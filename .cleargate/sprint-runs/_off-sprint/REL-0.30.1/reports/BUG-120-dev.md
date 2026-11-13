# BUG-120 dev (role: developer) — REL-0.30.1 U2

STATUS: done
COMMIT: 302e60f fix(upgrade): BUG-120 no-terminal upgrade finishes or refuses before writing (on 7652da0)
FILES: src/lib/merge-ui.ts, src/commands/upgrade.ts, README.md

Implemented G-R-8..12: stdinIsTTY seam + interactive rule; four-branch front of applyMerge3Way; refusal after dry-run block (stderr verbatim, exit 2, dispose first); MergePromptClosedError, end/close/already-ended settle, partial line not an answer, WeakMap leftover, pause/resume; handlers report wrote, loop collects written, stop lines + exit 1 without restamp/complete/drift state. README one sentence under Upgrading.

Tests
- typecheck clean.
- upgrade-no-tty.red 12/12; upgrade-state-parity.red + install-state-parity.red green; 23 default-tier files (upgrade*, install-state-parity, test/hosts, merge-ui/merge-helper, lifecycle-codex importers): 195 pass, 0 fail.
- Scratch build /tmp/cgb.zBgY of 302e60f: upgrade-field-path.red.integration 3/3 (BUG-122 + BUG-120 describes) green.
- Dispenser-shaped smoke (copy, `upgrade </dev/null`, CLEARGATE_NO_UPDATE_CHECK=1): exit 0, no prompt text. Tail:
  [take] .cleargate/templates/story.md  state=upstream-changed (unchanged locally)
  [upgrade] re-applied repo test stack: go test ./...
  [upgrade] complete.
  [upgrade] hint: more hosts are available — add one with `cleargate host add <name>`.
  Restart Claude Code in this repo to load the new config: .claude/settings.json

Deviations
- `untracked` is taken silently only when currentSha === null (missing locally); a present user-artifact file (classify returns untracked by tier) still goes to prompt/refusal, to avoid silently overwriting user data.
- Refusal's wouldPrompt filter is computed with the same predicate as the front of applyMerge3Way.
