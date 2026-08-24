# 0.24.0 Upgrade Rollout — Findings

**Date:** 2026-08-24
**Trigger:** User initiated `cleargate` upgrades in two repositories via separate Claude sessions; this session canvassed all seven live peer sessions to coordinate, answer questions, and capture defects.
**Status:** `new_app` upgrade **complete and verified** — 0.24.0 binary + 0.24.0 scaffold, `doctor` exit 0, 84/84 local scaffold tests pass. Second repo never identified; likely never started.

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

### 2. Three ID parsers give three different wrong answers on date-form IDs — HIGH

*(Upgraded from MEDIUM after `new-app-28` reported a third instance. This is not a truncation bug in one script; it is three independent grammars that disagree.)*

Against `BUG-2026-08-24`:

```
lifecycle-reconcile.ts:120   -> NO MATCH        (item is invisible)
active-criteria.ts:102       -> "BUG-2026-08"   (wrong id)
assert_story_files.mjs:110   -> "BUG-2026"      (wrong id)
```

All three agree on `BUG-007`. The reconciler's `\b` anchor combined with `\d{3}` means date-form ids do not truncate there — they vanish silently.

**This silently disables the CR-103 drift feature shipped in 0.24.0.** `detectDriftIds()` calls `reconcileLifecycle()`, i.e. parser #1. Any repo using date-form work-item ids gets a guaranteed no-op: every such item is reported clean forever. That is worse than not shipping the feature, because the index now carries an implicit "checked, no drift" claim it never evaluated. `new_app` uses date-form ids throughout (`CR-2026-08-05-*`), so it is affected today.

`new-app-28` independently found `CR-112` sitting in `archive/` marked `status: Draft` / `🟡 Pending Approval` despite `approved: true` and the work having shipped seven weeks earlier, and that stale frontmatter propagated a false claim into a downstream planning document. The reconciler that exists to catch exactly this cannot see a large class of that repo's items.

**Filed as [[BUG-041]] (P1-High).** Escalated after `new-app-28` reported four more sites: the real count is **ten**, six of them in `lifecycle-reconcile.ts` alone. Also confirmed there — `close_sprint.mjs:414/420` loads the reconciler for Step 2.6b, so cross-sprint orphan reconciliation at **every sprint close** has run the NO-MATCH parser since long before 0.24.0. And the bug has already been fixed twice downstream and destroyed once by an `always`-tier upgrade (`867260bf` fixed → `0cd1911b` reverted → `20792717` re-derived), which is the argument for fixing it upstream rather than letting each consumer re-patch. Field scale in `new_app`: 293 of 1,464 items are date-form (20%), rising to **43 of 54 (80%) in the unexecuted SPRINT-82/83 queue**.

*Candidate fix:* one shared ID grammar in a single module, all call sites derived from it — the same shape as CR-103's page-builder unification. Patching the three regexes separately would leave the divergence intact.

`new_app` also carries a local guard in `patch_dashboard.mjs` for the dashboard's version of this same bug, which is a fourth instance.

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

### 7. `collision_surface.sh` is blind to every heading variant except legacy §3.1 — HIGH

*(Upgraded from MEDIUM once `new-app-68` supplied the measurement.)*

The shipped parser is table-only — `collision_surface.sh:38`, `# ---- Parse §3.1 file surface table (multi-column fix)`. A story whose §3.1 declares its file surface as a bullet list yields zero parseable paths, which the BUG-033 fail-safe contract then treats as "no surface."

`new_app` carries two local fixes (`1e04861d` blind to this sprint's item formats, `00992f44` parse bullet-list file surfaces, not tables only). Neither is upstream, and the file is `overwrite_policy: always`, so every upgrade reverts them with no prompt. Recoverable there only because `.cleargate/scripts/` is git-tracked in that repo.

**Measured impact, from `1e04861d`:** SPRINT-81's regenerated SDR produced a **16-wave zero-parallel plan**. Not from real collisions — 11 of 16 reader digests returned an empty file surface, and empty is fail-safe-serialized by the BUG-033 contract. The synth serialized on *missing data*. Root cause: `parse_surface_paths` matched `^### 3\.1` only, the legacy story-template heading, which no SPRINT-81 item used ("Implementation Files Touched", "Affected Files", "Execution Sandbox"). The warning it emitted reads as "this item declares no surface" rather than "the parser cannot see this format" — silent and one-directional.

Patch received (207 lines, both commits): `1e04861d` widens heading variants, tokenizes within table cells, tightens `looks_like_path` to require a known extension; `00992f44` adds bullet-list parsing. The direction-of-error reasoning in the commit is the part worth upstreaming verbatim — over-inclusion over-serializes (safe), under-inclusion reads as "proven disjoint" and parallelizes colliding items (unsafe).

**This is the same failure shape as defect 2:** a silent wrong-partial that fails safe and therefore never gets noticed. Worth naming as a pattern in the CR.

### 8. `upgrade` output cannot distinguish a clean overwrite from a destructive one — HIGH

Reported by `new-app-68` post-upgrade. `cleargate upgrade` prints `[always] overwritten: <path>` **identically** whether the file was `state=clean` (disk matched the manifest baseline, nothing lost) or `state=user-modified` (local work just died). `--dry-run` distinguishes the two; the actual run discards the distinction.

The classification already exists and is already computed. Anyone who skips the dry-run gets no signal that local work was destroyed. This is one step upstream of defects 3 and 6 and is the single highest-value fix of the set: it makes the silent-overwrite class visible without changing any overwrite policy.

*Candidate fix:* carry the `state=` classification into the run's output for `always` and `pin-aware`, and emit a distinct marker for the `user-modified` case.

### 9. `close_sprint.mjs` usage text contradicts the policy it cites — MEDIUM

`close_sprint.mjs:120` describes `--assume-ack` as:

> `automated tests ONLY — conversational orchestrators MUST NOT pass this`

`cleargate-enforcement.md:491` says the opposite in the relevant case: the token "is set for a single invocation only after an **explicit human close authorization (Gate 4)**, or by CI." §12.3's prohibition is on passing the flag *"on its own initiative"* — unprompted — not on the human-authorized path.

The help text drops the carve-out while citing the section that grants it. Measured consequence: `new_app` softened its own `CLAUDE.md` in June 2026 on this basis, and in this session its agent independently concluded its Gate-4 path was "broken on disk" and was about to escalate a non-existent regression to the user. Two readers, same wrong conclusion, same string.

*Candidate fix:* restate the usage line to match §12.3 — reserved for CI **and** for a single human-authorized invocation, never unprompted.


---

## Product problem: work items filed against ClearGate are stranded by pre-member state

`new_app` holds **eight** work items authored against this package, unpushed since 2026-08-05 because that repo is pre-member and `push` exits 2:

- `CR-2026-08-05-status-reconcile-from-git` — ~166 lines, and by description already a spec for the `doctor` drift check proposed under defect 5
- `CR-2026-08-05-wiki-ingests-story-digests`
- `CR-2026-08-05-requirement-level-grounding-contract` — overlaps EPIC-052
- `CR-2026-08-05-cleargate-research-command`
- `BUG-2026-08-05-wiki-pages-assert-uncomputed-defaults` — likely the same defect CR-103 just fixed
- `BUG-2026-08-06-lifecycle-reconciler-path-construction`
- `CR-2026-08-01-preflight-stale-gate-deadlock`
- `CR-2026-08-01-dashboard-blind-to-date-form-ids` — defect 2, filed three weeks before this session rediscovered it

The repos best positioned to find ClearGate defects are precisely the ones running it as a consumer, and those are exactly the repos where `push` is unreachable. Bug reports accumulate invisibly. Two of these describe defects this session spent effort rediscovering from scratch.

*Not read.* `new_app` is outside this session's working directories; relay or explicit permission requested rather than reaching in.

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
- [ ] Decide whether defects 1–7 become formal BUGs. Defect 2 is the priority — it disables a feature shipped today.
- [ ] Retrieve the eight stranded work items from `new_app` (relay or permission).
- [x] `collision_surface.sh` patch received.
- [ ] Upstream three CRs from `new_app`: `collision_surface.sh` parser, `ships_migration` + `migration_surface.sh` (both absent here), `assert_story_files.mjs` (dated-ID regex, separator-anchored matching, `isMain` guard) + its test suite — which becomes the first upstream test for `extractWorkItemIds` / `findWorkItemFile`, currently unimportable because `main()` is called at line 293 unguarded.
- [ ] Decide whether `ships_migration` is upstreamed as a CR against `templates/story.md`.
