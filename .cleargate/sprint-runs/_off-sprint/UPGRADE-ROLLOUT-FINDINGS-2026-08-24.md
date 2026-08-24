# 0.24.0 Upgrade Rollout — Findings

**Date:** 2026-08-24
**Trigger:** User initiated `cleargate` upgrades in two repositories via separate Claude sessions; this session canvassed all seven live peer sessions to coordinate, answer questions, and capture defects.
**Status:** rollout in progress — one upgrade session found and advised, second not yet identified.

---

## Session census

| Session | Repo | Upgrading? |
|---|---|---|
| `new-app-68` | `/Users/ssuladze/Documents/Dev/new_app` (Chyro), branch `release/v1.42.0` | **Yes** — mid-flight |
| `doc-processor-5b` | `/Users/ssuladze/Documents/Dev/doc_processor` | No — mid-SPRINT-12, worktrees live |
| `doc-processor-9c` | `doc_processor` | No — extraction engine work |
| `doc-processor-06` | `doc_processor`, branch `sprint/S-12` | No |
| `macmini-83` | `/Users/ssuladze/Documents/Dev/macmini` | No — cleargate never installed |
| `new-app-28` | `new_app` (capacity audit) | No — but supplied the critical manifest finding |
| `doc-processor-8a` | unknown | no reply yet |

**Second upgrade repo is still unidentified.** Six of seven peers replied and only `new-app-68` is upgrading. Only `doc-processor-8a` is unaccounted for — and `doc_processor` is the one repo everyone has agreed to leave alone. Most likely the user's second target was never actually started, or was started somewhere not visible to `ListAgents`.

**`doc_processor` is off-limits.** Four live sessions, one mid-sprint with subagents in git worktrees, and files observed changing on disk under another session (`app/storage/paths.py`, STORY-039-03). `doc-processor-5b` explicitly requested no upgrade until sprint close and will ping for a fork analysis then. It also holds **two unreported CLI defects, one described as a hard blocker**, currently scoped out of that session by its user.

---

## Defects found

### 1. An unpublished build was serving every consumer repo on this machine — HIGH

`new-app-68` found its global binary was `cleargate@0.23.1`. **That version does not exist on npm** — `npm view cleargate@0.23.1` returns E404, and `_resolved` / `_from` are both null in the installed `package.json`. It was a local dev build installed globally from this checkout while `package.json` carried an uncommitted `0.23.1` bump.

Every repo on this machine resolving `cleargate` from PATH was therefore running unreleased, uncommitted code. The same uncommitted bump is what made this repo's own CHANGELOG contract test red (topmost entry `0.23.0`, `package.json` `0.23.1`) — the test was correctly reporting a real inconsistency and had been treated as noise.

Now resolved incidentally: the global is a genuine registry install of `0.24.0` (`npm ls -g --depth=0` shows a bare `cleargate@0.24.0`, no link arrow). The **process hole is not fixed** — nothing prevents `npm i -g .` from a dirty checkout, and nothing warns a consumer repo that its CLI version is unpublished.

*Candidate fix:* have `doctor` compare the running version against the registry and warn when it does not exist there.

### 2. `assert_story_files.mjs` silently truncates date-style BUG IDs — MEDIUM

`.cleargate/scripts/assert_story_files.mjs:110`:

```js
const re = /(STORY-\d+-\d+|(CR|BUG|EPIC|HOTFIX)-\d+|(PROPOSAL|PROP)-\d+)/g;
```

Against `BUG-2026-08-24` this matches `BUG-2026` — a **silent wrong partial**, not a miss. The extractor then asserts a file exists for a work item ID that was never authored, while the real one goes unchecked. `new_app` carries a local fix for this that is not upstream; taking theirs on that file regresses them.

The `STORY-\d+-\d+` alternative already models a two-segment ID, so the shape is expressible — `BUG` simply was not given one.

### 3. `pin-aware` overwrite policy destroys local hook edits with no prompt — MEDIUM

`applyPinAware` (`upgrade.ts:266-286`) reads the package file, substitutes the pin, and writes atomically. **No drift classification, no `k/t/e` prompt, no merge** — unlike `merge-3way`, which prompts. It applies to all three of `pre-edit-gate.sh`, `session-start.sh`, `stamp-and-gate.sh`.

Any local modification to those hooks is lost on every upgrade, silently, and never surfaces as a conflict. This is a deliberate over-correction for the pre-CR-088 bug where `pin-aware` fell through to merge-3way and baked the literal `__CLEARGATE_VERSION__` into the hooks — an unresolvable npm spec that killed the SessionStart banner and the whole PostToolUse chain, invisibly to both `doctor` and `--dry-run` because `computeCurrentSha` reverse-substitutes the pin before hashing.

The over-correction is defensible; the **silence** is not. It should at minimum print a warning when the on-disk file differs from the payload by more than the pin substitution.

### 4. `wiki build` does not reap orphan pages — LOW

`.cleargate/wiki/epics/EPIC-029.md` survives although its raw file was renamed to `PROPOSAL-029` long ago. `wiki build` regenerates pages from the delivery scan and never deletes pages whose source is gone, so the orphan keeps the pre-CR-103 format (`# EPIC-029: EPIC-029`, `Affects: None.`) indefinitely. Out of CR-103's scope by design.

### 5. `upgrade` can leave `.install-manifest.json` written-but-unstaged — HIGH

Found in `new_app` by `new-app-28`:

- Committed manifest at HEAD (`release/v1.42.0`, `f36c9407`): `cleargate_version: 0.16.0`, 79 files.
- Working tree (uncommitted, dirty for ~3.5 weeks): `0.20.0`, 66 files.
- Commit `0cd1911b` (2026-07-30) applied the 0.16.0 → 0.20.0 upgrade — deleted 13 files, rewrote the agent tier — but never staged the manifest write.

So the file changes are committed and the manifest describing them is not. Nothing in `upgrade` stages or even mentions the snapshot it just wrote, so any run inside a dirty tree can land here, and it stays silent until the **next** upgrade computes its 3-way base from a manifest that is weeks stale.

The trap has a second edge: the dirty manifest is the *accurate* one. Cleaning the tree before a big operation — the natural reflex, especially mid-release — makes `upgrade` believe it is going 0.16.0 → 0.24.0 across 79 files, 13 of which no longer exist, producing a wrong-base merge on every `merge-3way` file.

*Candidate fix:* a `doctor` check comparing `.install-manifest.json` against `git show HEAD:<path>`, warning when they disagree.

### 6. `overwrite_policy: always` is the majority of the payload, and it never prompts — HIGH

The 0.24.0 manifest is **48 `always`, 16 `merge-3way`, 3 `pin-aware`, 1 `skip`** across 68 files. Only the 16 `merge-3way` entries produce a `k/t/e` prompt. Everything else — including the entire `.claude/agents/` tier (`architect.md`, `architect-reader.md`, `architect-synth.md`, `developer.md`, `qa.md`) — is overwritten unconditionally.

This makes "audit your local forks before taking theirs" misleading advice: it governs less than a quarter of the payload. A user who carefully triages their `merge-3way` files can still lose every agent-tier edit in the same run, with nothing printed.

Worse in `new_app` specifically, where `.claude/` is gitignored (`.gitignore:84`): the agent tier has **no git baseline at all**, so there is no recoverable "before" to diff or restore from. A pre-upgrade tarball is the only witness. Same shape as defect 3 (`pin-aware`), and the same fix applies — warn when an unconditional overwrite is about to replace a file that differs from the payload.

---

## Cross-repo hazards (not defects)

- **Work-item ID collisions across repos.** `new_app` carries a local `CR-068` (DB-collision axis, `ships_migration` / `db_write_set` fields). The meta-repo's `CR-068` is `Init_Silence_DEP0190_Shell_True_Warning` — unrelated. Any future sync against a shared ClearGate project would collide.
- **`ships_migration` will never arrive upstream on its own.** Zero occurrences across the entire meta-repo. `new_app` must re-restore it after every upgrade unless it is filed here as a CR against `templates/story.md`. Its sibling `db_write_set` *is* upstream, but from an unrelated lineage — `EPIC-033` wave-planner axis 4 — so its survival under take-theirs is coincidence.
- **`doc_processor` runs the CLI from a local `cleargate-cli/dist/cli.js`,** not the published package, so an npm publish does not reach it at all. Its upgrade path is different from `new_app`'s and needs separate handling.

---

## Advice issued to `new-app-68`

Of six locally-forked scaffold files: **drop 3, keep 3.**

| File | Verdict | Reason |
|---|---|---|
| `agents/architect-reader.md` | drop fork — *but diff first* | `db_write_set` upstream (3 hits); may also carry local `ships_migration` logic |
| `agents/architect-synth.md` | drop fork — *but diff first* | `db_write_set` upstream (7 hits); same caveat |
| `scripts/close_sprint.mjs` | drop fork | Upstream moved the **opposite** direction — hardened `--assume-ack` to require `CLEARGATE_CI_ACK=1` per enforcement §12.3. The local fork *softens* it, against enforced policy |
| `templates/story.md` | take theirs, restore one line | 0.24.0 carries **both** `db_write_set` and all CR-104 performance content; only `ships_migration` needs re-adding |
| `scripts/assert_story_files.mjs` | keep fork | Defect 2 above — shipped version regresses it |
| `knowledge/cleargate-protocol.md` | keep fork | §23.5 DB-collision axis not upstream; payload protocol has 23 sections, zero collision hits |

Also corrected: `cleargate upgrade` **does** bump the hook pins (CR-088, shipped 0.18.0). No hand-bump needed; expect three `[pin] rewritten with pin 0.24.0` lines.

---

## Open

- [ ] Confirm with the user whether a second upgrade was ever actually started — only `doc-processor-8a` remains unaccounted for, and `doc_processor` is off-limits.
- [ ] `new_app`: commit or deliberately discard the stale manifest diff BEFORE upgrading. Do not tidy the tree first.
- [ ] Collect `doc-processor-5b`'s two CLI defects, one a hard blocker, at its sprint close.
- [ ] Decide whether defects 1–3 become formal BUGs.
- [ ] Decide whether `ships_migration` is upstreamed as a CR against `templates/story.md`.
