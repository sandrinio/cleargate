# Goal check (b) — packed RC upgrade on copies of dispenser_adapter

RC: `npm pack` of cli main 9462dcf (prebuild + build in a throwaway worktree), cleargate-0.30.1.tgz, installed with `--prefix` into scratch. Never published. Two fresh clones of dispenser_adapter (never the real repo):
- **A** = HEAD 189bae7 (installed 0.30.1)
- **B** = a30b5c4 = parent of `chore(cleargate): upgrade ClearGate 0.28.0 to 0.30.0` (installed 0.28.0)

| Criterion | A (HEAD) | B (0.28.0 install) |
|---|---|---|
| dry run lists only files that change | 13 planned + `[dry-run] 67 unchanged (not listed)`; settings.json listed as host surgery target (C-3) | 30 planned + `[dry-run] 50 unchanged (not listed)` |
| dry run names every file whose local edits it replaces | `gate-checks.json … user-modified → overwritten, local edits lost` (the only user-modified file) | same |
| `--yes` keeps settings.json hook order; diff shows only ClearGate's hooks | `git diff .claude/settings.json` empty | +9 lines: ClearGate's `PostToolUse` `Bash` group (`post-shell-ingest.sh`) only; event order `Stop,SubagentStop,PreToolUse,PostToolUse,SessionStart` before and after |
| exit codes | dry run 0, `--yes` 0 | dry run 0, `--yes` 0 |

Verdict: met.

Finding (for the walkthrough): the dry run labels `gate-checks.json` "overwritten, local edits lost", but upgrade's gate-checks handling keeps the repo's values (`kept qa.test "make check"` …). On A the file came out byte-identical, and on B only empty values were filled by detection. The label over-warns; nothing is lost. Raw outputs: `evidence/goal-b/`.
