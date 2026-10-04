# SPRINT-41 test-runner environment recipe

2026-09-30 operational clarification, following BUG-047's documented wrapper-environment contamination. No product or acceptance change. Applies to every future Developer, QA and DevOps test dispatch in this sprint.

Package test scripts run directly from the owning CLI checkout, outside `run_script.sh`. Explicitly sanitize the wrapper recursion guard as well as the three ambient root selectors:

```sh
env -u RUN_SCRIPT_ACTIVE -u ORCHESTRATOR_PROJECT_DIR -u CLAUDE_PROJECT_DIR -u CLEARGATE_REPO_ROOT npm test
env -u RUN_SCRIPT_ACTIVE -u ORCHESTRATOR_PROJECT_DIR -u CLAUDE_PROJECT_DIR -u CLEARGATE_REPO_ROOT npm run test:file -- <relative-test-path>
```

Standalone bash/node scripts still use the absolute `run_script.sh` wrapper with inline `ORCHESTRATOR_PROJECT_DIR`. If a wrapped orchestration script launches a package test, its test child must use the sanitized environment above; the parent wrapper may retain its guard. Never remove the product wrapper guard or alter tests to hide contamination.

For a long suite, redirect complete stdout/stderr to a unique durable log, retain the returned execution session ID, poll until terminal completion, and save the actual exit code. A yielded tool result is not completion. Do not restore test side effects, build, or move to the next gate while the suite is active.

BUG-047 evidence: inherited `RUN_SCRIPT_ACTIVE=1` suppressed incident creation in three wrapper-test files. Clearing it made all 29 affected tests pass in solo runs; a separate clean-environment full suite supplies the merge gate. The original failed logs remain preserved. This reconfirms the existing 2026-06-04 and 2026-07-19 flashcards, rather than adding a duplicate lesson.
