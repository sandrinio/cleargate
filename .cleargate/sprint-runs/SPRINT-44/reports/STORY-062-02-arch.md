# STORY-062-02 — Architect Post-Flight (§C.6)

role: architect

**Verdict: ARCH: PASS**

I reviewed the integrated commit `a9ab8f8` on cli `story/STORY-062-02`. It contains Dev `7e24a97`, QA-Red `52989fa` and C2 `343c989`, plus cli `main` `2f99b7f` (01 and 03) merged in with no conflicts. The worktree was read-only and `git status --porcelain` was empty. I ran every merge simulation and probe in a scratch `git clone --shared` (`node_modules` symlinked), so no real worktree, branch or ref was touched.

## Dispatch flag: `typecheck: exit code 254`

This is the known BUG-087 false fail. In the scratch clone, `tsc --noEmit` exits 0 at `a9ab8f8` and also on the simulated 04-on-02 tree (§2). There is no structural signal behind the flag.

## 1. Conformance to M1 (STORY-062-02) and the C2 freeze

| Check | Result | Evidence (`a9ab8f8`) |
|---|---|---|
| C2 frozen names | PASS | `BacklogItem` and `BacklogData` are byte-identical to C2 (extracted and diffed). `collectBacklog(cwd: string): BacklogData` is unchanged (`backlog.ts:131`). The only other line changed in the header is the import block, which is allowed. |
| `serve.ts` zero edits | PASS | `git diff 343c989 7e24a97 -- serve.ts` is 0 lines. On the integrated tree, the +/- lines of `main..a9ab8f8` for `serve.ts` are exactly C2's `collectBacklogFn`, `/` and `/data` lines. |
| `render.ts` two hunks only | PASS | (1) The `cgRenderBacklog` stub line is replaced by one contiguous block (`:740–843`). (2) The `renderBacklogPanel` body is replaced and its signature is unchanged (`:894`). The C1 comment (`:739`), the `cgRenderPlan` stub (`:844`), the load calls, the poller and `render()` (`:931`, C2's widening only) are untouched. |
| No `filter-chip` / `doc-btn` in backlog markup | PASS | The added lines use only `bl-*` classes and `data-bl-*` attributes. The panel adds a `<style>`, never a `<script>` (flashcard 2026-11-10 #dashboard: cr102 reads the first `<script>`). |
| CSS tokens | PASS | All ten `var(--cg-*)` tokens used by `.bl-*` are defined in STYLE. |
| R1–R3 collector | PASS | `readdirSync` is sorted. `SPRINT-*`, dotfiles and non-`.md` files are skipped. The id regex is the same as 03's `fileIdOf`. Type is `parseFrontmatter` → `detectWorkItemTypeFromFm` ?? `detectWorkItemType`. Every throw becomes a diagnostic, and the whole body is wrapped (`:179`). `children` covers `EPIC-` parents only and uses natural sort. |
| Client escaping | PASS | Every id, title, type, sprint, status heading, option value and failing id goes through `cgEsc`. The DATA blob escapes `<` (`render.ts:566`). |
| Snapshot path (Rule 2) | PASS | `writeDashboardSnapshot` never calls `collectBacklog`. `render(collect())` shows the "live dashboard" hint. `SprintDashboardData` is untouched, because `backlog` is an intersection extra. |
| Red files untouched by the Dev | PASS | `git diff 52989fa 7e24a97 -- test/` touches only `backlog.node.test.ts` (5 tests, a new non-red file). QA-Red left that file to the Developer, and §3.1 lists it, so this is accepted against ground rule 2. |

**Deviation (accepted, no change needed).** `titleOf` (`backlog.ts:67`) strips a leading id even when no `:` follows it. M1 said to keep the whole heading when there is no `<id>:`. I probed the real repo (135 items) and found no stripping artifacts. The only two non-alphanumeric titles start with a genuine `§`. QA also noted this.

## 2. Fit for STORY-062-04 — merge preview against `a9ab8f8`

**Tree identity.** `a9ab8f8^{tree}` = `7380868`, which is exactly the tree I simulated in the 01 post-flight (`e5e3a5f` × `7e24a97`). 04 is still at `39a513c`. When 02 merges, cli `main` gets that same tree, because `a9ab8f8` already contains `main`. So this preview matches 04's real integration base.

`git merge-tree --write-tree a9ab8f8 39a513c`: exit 1, with **exactly the three forecast conflicts and nothing new**:

| # | File | Kind | Resolution (unchanged from the 01 forecast) |
|---|---|---|---|
| 1 | `src/dashboard/serve.ts:32` | import append/append (`AddressInfo` vs `randomBytes, timingSafeEqual`) | Keep both. |
| 2 | `src/dashboard/render.ts:295` | CSS append/append after `.cg-diagnostics li` (tab-bar vs `plan-*`) | Keep both, with 01's tab-bar block first. |
| 3 | `src/dashboard/render.ts:965` | Adjacent stub lines: main has 02's backlog block plus the `cgRenderPlan` stub; 04 has the `cgRenderBacklog` stub, then `cgPlanToken`, then `PLAN_CLIENT` | Keep 02's block, then `cgPlanToken`, then `PLAN_CLIENT`. **Delete both stub lines.** |

**Simulated resolution, in the scratch clone, applying the table exactly:**
- `grep -cE '/\* STORY-062-0[24] \*/ \}' src/dashboard/render.ts` = `0`. There is one `function cgRenderBacklog(` and one `function cgRenderPlan(` (inside `PLAN_CLIENT`).
- `tsc --noEmit`: exit 0.
- 11 targeted files, one invocation each, all green:
  - plan files: `plan-roundtrip.red` 2/2 (now green with 02 and 03 present), `plan.red` 9, `plan-endpoint.red` 24, `plan-tab.red` 14, `plan` 9
  - backlog files: `backlog.red` 18, `backlog-tab.red` 13, `backlog` 5
  - shell files: `render` 31, `tab-shell.red` 13, `serve` 2
- **Who resolves:** the 04 Developer, at 04's integration (rule 13). Only production `src/` files conflict, so QA-Red is not needed.

**New finding: 04 disables stale-claimed rows on the Plan tab, contrary to its clarified R2.** This is a 04 issue, not a 02 defect, and it only becomes visible now that 02 feeds real `sprint` values.
- STORY-062-04 R2 (clarified at the 07:35Z amendment, M1 decision 1) says: only a claim by an open sprint disables a row. A claim by a Completed, archived or missing sprint is stale, and the row is enabled with the warning `claimed by <OTHER> (<reason>) — will be reassigned`, matching `sprint add`.
- M2 was written before that amendment and still says `disabled = !member && item.sprint !== null && item.sprint !== s.id` (M2.md:103). 04's `plan.ts` `candidatesFor` implements that rule as written. No 04 test covers a stale claim. The only other-sprint fixture, BUG-052 → SPRINT-42, is an open claim.
- **Real-repo probe** (02's `collectBacklog` plus 04's `collectPlan`, read-only on OUTER):
  - In every draft sprint (31, 37, 42, 43), all 15 carried bugs BUG-102..116 show as `disabled: true`, with `otherSprint: 'SPRINT-41'` and warning `in SPRINT-41`. SPRINT-41 is Completed.
  - CR-097 (claim `SPRINT-99`, no sprint file, `carry_over: false`) is not a candidate at all.
  - `cleargate sprint add` would reassign all 16 (`sprint-scope.ts:437–455`).
  - **Net effect:** the Plan tab cannot schedule the carried backlog. That is the exact dead end M1 decision 1 removed from the CLI.
- **Recommended route:** do this before 04 integrates. `plan.ts` is 04-only, so the fix cannot conflict with 02. Per the dispatch-vs-plan precedence rule, first re-dispatch the Architect to amend M2. Then QA-Red adds a stale-claim red. Then the 04 Developer fixes `candidatesFor`. The M2 delta:
  - **Eligibility.** Add `|| staleClaim(item.sprint)`.
  - **`staleClaim(x)` classification.** Use the same classification and order as `sprint-scope.ts:437–455`: `findSprintPlanFile(cwd, x)` is null → `no sprint file`; `status === 'Completed'` → `completed`; path under `delivery/archive/` → `archived`; otherwise the claim is open.
  - **Stale row.** `disabled: false`, `otherSprint: null`, and the warning `claimed by <X> (<reason>) — will be reassigned` replaces `in <X>`.
  - **Open-claim rows.** Unchanged.

**Minor (owner call, not blocking).** 04's `collectPlan` lists the `Abandoned` sprints SPRINT-07 and SPRINT-29 as Plan targets. This matches R1 literally ("not Active or Completed"), and 03 accepts them as well.

**Carried from the 01 post-flight:** 04's stale `boundPort` comment, and the SKILL.md copies (M1 risk 11). Neither has changed.

## 3. Performance of the backlog mtime cache under the ~2 s poller

- **Bounded.** `CACHE` (`backlog.ts:46`) is keyed by absolute path. Each call prunes entries under this pending-sync directory that the listing no longer contains (`:167–169`), so the size is at most the current number of `.md` files (135 today).
- **One cwd per daemon.** A daemon serves a single fixed `cwd`, so nothing accumulates across roots in production. Entries for other roots pile up only in test processes, and only for the length of the run.
- **Failed directory read.** If `readdirSync` fails, the prune is skipped. The entries stay at their last size and do not grow.
- **Cost per poll.** One `readdirSync` plus one `statSync` per file. `SPRINT-*` files are skipped before the stat. A file is re-parsed only when `mtimeMs` or `size` changes.
- **Measured on the real repo (135 items):** cold call 77 ms; warm call about 1.3 ms (50-call average). At one `/data` per 2 s that is negligible.
- **04 adds no second scan.** On `39a513c`, `serve.ts:292/309` call `collectBacklogFn` once per request and pass the result to `collectPlan`.
- **Races heal themselves.** If a file changes between the stat and the read, the cached entry keeps the older mtime, so the next poll re-parses it. 03's tmp files (`*.cg-tmp-<pid>`) do not end in `.md` and are never listed.
- **Shared references.** Cached `BacklogItem` objects are returned by reference. Every consumer today is read-only: the `/data` JSON, the DATA blob (`renderDataBodies` spreads but never touches `backlog`), and 04's `candidatesFor`, which builds new candidate objects.

## Advisory (non-blocking; follow-up candidates)

1. **Poll re-renders.** `cgRenderBacklog(fresh)` rewrites the whole `#backlog-list` `innerHTML` on every 2 s poll, even when nothing changed, and even while the tab is hidden. A user loses any text selection, and focus on an expand button, every 2 s. Fix: skip the render when `JSON.stringify(d.backlog)` equals the last one.
2. **Mutation hazard.** A future consumer that mutates a returned `BacklogItem` would corrupt the cache across polls. Fix: document it as read-only, or `Object.freeze` the item at cache-fill time.

## Open decisions for orchestrator

1. **The 04 stale-claim gap (§2).** Re-dispatch the Architect to amend M2, then QA-Red, then the 04 Developer, all before 04's integration. The alternative is for the owner to accept the deviation and use the CLI for the carried items. Without the fix, Goal Check 3 ("a Plan-tab commit changes membership exactly as the command does") still passes, but for the 16 stale-claimed items the Plan tab does not offer what the command allows.

## Script Incidents

None. No wrapped script was invoked. I used `git merge-tree`, a scratch `git clone --shared`, `tsc` and `npm run test:file` with a short private `TMPDIR`.

flashcards_flagged:
- `2026-11-10 · #planning #amendments · A story R-clarification logged after its M-plan was cut never reached the Dev; amend the M-plan row too.`
- `2026-11-10 · #dashboard #cache · collectBacklog returns cached BacklogItem objects by reference; consumers must not mutate them.`
