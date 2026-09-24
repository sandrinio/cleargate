# SPRINT-41 — authorized Codex bootstrap

Decision recorded 2026-09-11T23:30:09Z from the owner's instruction:
"make decisions on your own. deliver the sprint goal and make sure it's tested
in a temporary folder in Dev/CG_TEST".

## Authority and outcome

This supersedes the outstanding bootstrap/baseline approval requests in the
startup blocker report. The orchestrator decides implementation details and
reconciles the obsolete serial fallback specification with the owner's requested
Workflow equivalent. It does not waive test failures or claim enforcement that
has not been observed. Sprint close, publication, global trust changes, and
destructive changes to existing user work remain outside this authorization.

Sprint goal: Make the frontmatter locator position-independent so freshly
scaffolded work items stop corrupting and start gating, and land the first slice
of multi-host adapter support with Claude Code proven intact by clean-room
verification.

## Isolated execution baseline

- Test root: `/Users/ssuladze/Documents/Dev/CG_TEST` (created for this request).
- Unique run: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1`.
- Development meta-repository: `<run>/workspace`; CLI owning repository:
  `<run>/workspace/cleargate-cli`.
- DevOps creates clean local clones and checkpoints non-secret current planning
  inputs there. Existing original working trees, indexes, user files and branches
  are preserved. No broad stash, reset, or commit of the original workspace.
- Code changes use isolated story branches; integration is serialized through
  DevOps into `codex/sprint-41`. New branch names use the Codex prefix.
- Fresh installed projects live outside the development checkout under this same
  unique run directory. Install from the built npm tarball, not source symlinks.
- Original sprint reports remain the durable user-visible evidence location;
  operational state has one explicitly chosen writer and is never reinitialized.

## Bounded bootstrap exception

Before the new executor can execute ordinary waves, native Codex role delegation
may build and qualify its development-only slice plus the minimum enforcement
prerequisites. Astra owns architecture/orchestration; Terra owns implementation,
QA and DevOps; Sol owns research/report synthesis. Complete profiles are explicitly
loaded. Private conversation tools must not become a dependency of the shipped
executor; it must use a documented customer-callable local Codex transport.

The slice must preserve durable identities, bounded parallel segments, owning-repo
worktrees, role separation, test gates, blocker recovery, flashcard barriers and
single-writer merge. Unknown metering is unavailable. Early blockers must not
fabricate commit SHAs. No inherited Claude flashcard suppression is copied.

Bootstrap code and fixture tests are not the end-to-end proof. Qualification
requires real transport and enforcement evidence. Cut over only after all admitted
work is drained or durably suspended, with hashes and resume boundary recorded.
The installed Codex payload and independent clean-room story evidence remain
STORY-058-12/-13 deliverables after their prerequisites. Claude remains usable;
its existing agents and execution path are not replaced by the Codex adapter.

## Acceptance and stopping boundaries

Use the existing sprint Goal Acceptance Check, strengthened by the owner's fresh
CG_TEST installation requirement. Run the actual affected-package suites and
typecheck, shell hook tests, artifact install/lifecycle checks, Claude regression
controls, and real Codex role-loop/merge and denial/allow controls. Record command,
exit status, artifact hash and evidence path. Do not mark all items Done merely
because readiness gates pass or the bootstrap runs.

Resolve implementation choices and in-scope defects autonomously. Stop only for
genuinely missing external authority/access, unavailable required infrastructure,
or an unsafe action that cannot be avoided. Do not use trust/approval bypass flags.
