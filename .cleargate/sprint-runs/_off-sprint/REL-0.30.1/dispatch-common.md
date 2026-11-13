# REL-0.30.1 — rules every dispatch follows

- Plan: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/_off-sprint/REL-0.30.1/plans/M1.md`.
  Read "Binding execution facts", your bug's "Per-bug blueprint" section (its G-R items are binding),
  its "Red-test plan" row, its "Existing tests that change shape" entry and "Orchestrator decisions".
- Bug files: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/delivery/pending-sync/BUG-NNN_*.md`
  (acceptance Gherkin is §5 / "Verification"; recorded human decisions are in the Open Questions).
- Work ONLY inside your unit's worktree under `/Users/ssuladze/Documents/Dev/cg-wt/<unit>` (a linked
  worktree of the cleargate-cli repo; `node_modules` is a symlink to the main checkout's — never write
  through it). Never edit the main checkout `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`,
  `cleargate-planning/`, the live `/.claude/`, or anything else in the outer repo except your report file.
- HARD RULE: never `npm run build` / `npx tsup` inside any cleargate-cli checkout or worktree. A built CLI
  of your branch comes only from the scratch recipe in "Binding execution facts" (`git archive <ref>` of a
  COMMITTED ref into `mktemp -d /tmp/cgb.XXXX`, symlink node_modules, `npm run build` there).
  The main checkout's `dist/cli.js` is the 0.30.0 build of this branch's base (b9fe36a): you may RUN it
  (read-only, against temp dirs only) as `CLEARGATE_BUILT_CLI` to prove an integration red fails on base.
- Never run `wiki build` / `wiki ingest` / `doctor` / `init` / `upgrade` against
  `/Users/ssuladze/Documents/Dev/ClearGate` or the main cli checkout. Temp dirs only.
- Shell is zsh: `export TMPDIR=$(mktemp -d /tmp/x.XXXX)` first; use `command grep` (plain grep is a
  gitignore-aware shim that hides files); don't keep a command in a variable, use a function.
- Tests: node:test only, `*.node.test.ts` (vitest forbidden). One file: `npm run test:file -- <file>`.
  Default-tier reds are `*.red.node.test.ts`, in-process, no dist. Built-CLI reds are
  `*.red.integration.node.test.ts`, spawn `process.env.CLEARGATE_BUILT_CLI ?? <CLI_ROOT>/dist/cli.js`,
  FAIL (never skip) when it is absent, and set `CLEARGATE_NO_UPDATE_CHECK=1` on every spawn.
- The repo is public: no machine paths, user names or field-repo content in fixtures or code.
  Field IDs from the dispenser repo are written ⟦ID⟧ in prose, never [[ID]].
- Never `--no-verify`, never `git reset --hard`, never force anything, never rewrite history.
