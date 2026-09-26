# Clean-room verification procedure

STORY-058-08. Live-only: this document has no `cleargate-cli/scaffold/core`
twin. It verifies ClearGate's own packed artifact — shipping it would change
every install's bytes, which is exactly the thing it exists to catch.

## Purpose

Cross-Cutting Rule 8 (SPRINT-41 / EPIC-058): no `init`/`upgrade`/`doctor`/
`uninstall` change is Done without a clean-room install from the packed
artifact. A clean-room run is required for any change to `init`, `upgrade`,
`doctor`, `uninstall`, `src/hosts/**`, `src/init/**` or `scaffold/**`.

What the procedure proves: a real install from the packed npm artifact, with
the hooks run by the host they were written for — not a source-tree
in-process call, and not the maintainer's own long-lived dogfood copy.

## Why not the in-repo dogfood instance

Live `/.claude/**` in this repository is gitignored and hand-synced (CR-099).
It reflects this machine's re-sync history, not the payload: BUG-024 shipped
its own fix while the repo kept running the buggy hook underneath it, and B0
found and rewrote six drifted live files in one pass. Its hooks resolve
`cleargate-cli/dist/cli.js` first — a local build, never the packed artifact
a user actually installs.

It also carries years of accumulated state, so first-run paths never execute
there — BUG-067 (the frontmatter-locator corruption) only fires on the very
first `cleargate new` in a repository, a state this instance passed through
long ago and can never re-enter. `cleargate verify-install` run against this
meta-repo fails `version-match` by design: its own install snapshot is
version `0.10.0`.

## Why not a local-dist install

Measured (F9): a local-dist install — copying `templates/cleargate-planning/`
straight out of a checkout — differs from a real one. The payload's own root
`.gitignore` ships in that directory, but `npm-packlist` strips any file
literally named `.gitignore` from every published tarball, unconditionally.
So only an extracted `npm pack` tarball reproduces the tree a real user gets;
a local-dist install silently carries a file no install ever has.

## Why not /tmp or inside the repository

`/tmp` on macOS is a symlink to `/private/tmp`, so the realpath resolved from
`process.cwd()` and the shell's own `$PWD` disagree — a path-equality check
(including this driver's own `--cwd` resolution) sees two spellings of one
directory. `os.tmpdir()` is also where every existing unit fixture already
lives (`foreign-repo.integration.node.test.ts` among them), and none of them
ever caught BUG-067 — a temp-dir fixture is not a substitute for this
procedure. Temp cleaners can also delete the room before a human gets a
chance to reopen a real session in it, which this procedure requires.

Inside the repository is excluded for a different reason: Claude Code reads
every enclosing `CLAUDE.md`, and git resolves the enclosing repository — a
nested room is never actually isolated from the meta-repo it sits inside.

## Location

One disposable container per run, always a sibling of the repository, never
inside any git work tree. On the maintainer machine that is
`~/Documents/Dev/cg-cleanroom-<YYYYMMDDTHHMMSSZ>-<label>/` (measured — not
inside any enclosing `.git`).

It is disposable and recreated per run: the container must not exist before
the run starts, and it is never reused across runs.

Layout:
- `src/` — the build clone (`## 1`)
- `artifact/` — the packed tarball
- `tools/` — the `npm install --global --prefix` target
- `repo-<label>/` — one per host selector (`## 3`)
- `evidence/` — machine-check JSON and recorded transcripts

Delete the container only after its evidence has been committed. Agents
leave it in place and name its path in their report rather than cleaning up
automatically.

## 1. Build the packed artifact

```
git clone --no-hardlinks --branch <ref> <cli> <C>/src
ln -s <cli>/node_modules <C>/src/node_modules
cd <C>/src && npm run build   # prebuild runs as the npm lifecycle
npm pack --pack-destination <C>/artifact --json
```

`<ref>` defaults to `main`. Record `git -C <C>/src rev-parse HEAD` and
`shasum -a 256` of the produced tarball alongside the run's evidence.

No `npm publish`, no push. Precedent:
`test/commands/init-from-source-dist.integration.node.test.ts:60-67`.

## 2. Install the artifact

```
npm install --global --prefix <C>/tools <C>/artifact/cleargate-<v>.tgz
export PATH=<C>/tools/bin:$PATH
```

**Identity gate (F1).** `command -v cleargate` must print
`<C>/tools/bin/cleargate`, and `cleargate verify-install --help` must exit 0.
Without this gate, every hook in the room resolves the global `cleargate` on
PATH instead of the artifact under test, and the room silently verifies the
published release rather than the branch under review.

**No room ever contains a `cleargate-cli` entry — neither a directory nor a
symlink.** Two mechanisms key on `<room>/cleargate-cli`: the hooks' own CLI
resolver tries `${REPO_ROOT}/cleargate-cli/dist/cli.js` first, and
`checkCanonicalDrift` looks for `<cwd>/cleargate-cli/scaffold`. A stray entry
there (even a symlink minted for convenience) silently swaps the artifact
under test for the meta-repo's own build and engages the meta-repo drift
check inside the room.

**Scrub the environment.** Unset `CLAUDE_PROJECT_DIR`, `CLAUDE_SESSION_ID`,
`CLAUDECODE`, `ORCHESTRATOR_PROJECT_DIR`, `SKIP_FLASHCARD_GATE`,
`SKIP_RED_GATE`, `SKIP_SURFACE_GATE` and every `CLEARGATE_*` variable before
running anything inside the room. Left set, they route hook logs and ledger
rows into the meta-repo instead of the room being verified.

## 3. Create one clean room per host selector

```
mkdir <C>/repo-<label> && (cd <C>/repo-<label> && git init -q && cleargate init --yes [--host <sel>])
```

Every host selector gets its own fresh directory. Never re-run `cleargate
init` with a second selector inside a room that already has one — that
conflates two installs this procedure needs to compare separately.

## 4. Machine checks (cleargate verify-install)

Run `cleargate verify-install --json > <C>/evidence/<label>.verify.json`
(pass `--host claude` in a multi-host room) and `cleargate doctor`. Both must
exit 0.

Record `doctor --check-scaffold`'s summary as information only (F8): a fresh
install's snapshot pre-dates the post-`applyTestStack` sha of
`.cleargate/scripts/gate-checks.json`, so it reports one `upstream-changed`
file even on a pristine room. That is a pre-existing false positive, not a
clean-room defect, and it never gates this procedure.

`scaffold-lint` lints the scaffold *source* (`cleargate-cli/scaffold/`), not
an installed tree, so it is not a clean-room check — it never ran in a room
in the reference run and does not belong in this section.

## 5. Live host checks — Claude Code

The headless recipe:

```
claude -p "<prompt>" --setting-sources project,local --permission-mode bypassPermissions \
  --model <pinned> --output-format stream-json --verbose --include-hook-events --max-turns 4 < /dev/null
```

- `--output-format stream-json --verbose --include-hook-events` (F2) emits
  machine-readable `system/hook_started` / `system/hook_response` events
  (`hook_name`, `hook_event`, `exit_code`, `outcome`, `output`) and a
  `system/init` event (`agents[]`, `skills[]`, `mcp_servers[]`,
  `claude_code_version`).
- `--setting-sources project,local` (F3) isolates the session from this
  machine's own user-level plugins, hooks and skills, so the room's own
  installed set is what actually loads.
- `--permission-mode bypassPermissions` still fires every PreToolUse hook —
  it changes what a denial does to the tool call, not whether the hook runs.

Two session prompts drive the checks (verbatim wording lives in
STORY-058-09's harness once it lands):
- **S1** — one `Edit` on a freshly authored delivery item, to exercise
  `SessionStart`, `PreToolUse:Edit` and `PostToolUse:Edit` (the
  stamp-and-gate cycle).
- **S2** — one `Agent` dispatch of the `qa` subagent, to exercise
  `PreToolUse:Agent` and `SubagentStop` (dispatch attribution).

What each `claude.live.*` id reads from the stream:
- `claude.live.session-start` — a `SessionStart` `hook_response` with
  `exit_code 0` and output matching `^ClearGate state: `.
- `claude.live.pre-tool-use` — `PreToolUse:Edit` (S1) and `PreToolUse:Agent`
  (S2) responses all `exit_code 0`.
- `claude.live.post-tool-use` — `PostToolUse:Edit` `exit_code 0`, plus the
  matching `gate-check.log` line reading `stamp=0 gate=0 ingest=0`.
- `claude.live.dispatch` — a `SubagentStop` `exit_code 0` and a new
  `token-ledger.jsonl` row carrying the dispatched `agent_type`.
- `claude.live.agents-skills` — `system/init`'s `agents[]`/`skills[]` include
  the installed set.
- `claude.live.mcp-connect` — `system/init`'s `mcp_servers` includes
  `cleargate`.
- `claude.live.agents-md-exposure` — emitted only when the room has an
  `AGENTS.md` (a Codex/portable install): Claude Code 2.x ships a builtin
  `agents-md` plugin that loads `AGENTS.md` when no `CLAUDE.md` exists, so a
  room with both files must show that a canary placed in `AGENTS.md` does
  not reach the session.

**Interactive alternative.** Open `claude` directly in the room: the
`ClearGate state:` banner prints at session start, editing a delivery item
runs the same hook cycle, and `/agents` lists the installed agents. Workspace
trust is skipped entirely in `-p` (headless) mode.

## 6. Record the evidence

Record one table per run: `id | room | PASS/FAIL | pointer`, one row per
check above. Record both rooms' full verdict sets and their diff explicitly
— a silent difference between the no-flag room and a multi-host room is a
Claude-observable regression (Rule 2), not noise. Evidence for a sprint's
Claude baseline goes to
`.cleargate/sprint-runs/<sprint>/clean-room-evidence.md`.

Automated by `cleargate-cli/scripts/clean-room/claude-baseline.mjs run`
(STORY-058-09) once it lands; `check` verifies the recorded evidence against
the current artifact inputs.

## Other hosts

Codex's own clean-room steps are STORY-058-13's — it extends
`HOST_VERIFIERS` with a `codex` entry and appends this document's Codex
section rather than starting a second procedure.
