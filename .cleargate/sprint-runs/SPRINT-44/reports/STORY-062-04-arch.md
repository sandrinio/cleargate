# STORY-062-04 — Architect Post-Flight (§C.6)

role: architect

**Verdict: ARCH: PASS**

I reviewed cli `story/STORY-062-04` at `ca2b644`. It contains C4 `d6c74ac`, Dev `39a513c`, QA-Red `a41bc6b` and `1624636`, the integration merge `5dcae45` (parents `1624636` and cli `main` `0e60fbd`), and the fix `ca2b644`, which touches only `plan.ts`. The real worktree and the cli main checkout were left alone: both `git status --porcelain` outputs are empty, and the refs are unchanged (`main` = `0e60fbd`, story = `ca2b644`). I ran every build, test and probe in a scratch `git clone --shared` with `node_modules` symlinked. Write probes ran only against a git-tracked copy of the delivery tree in a private TMPDIR, and that copy has been deleted.

## Dispatch flag: `typecheck: exit code 254`

This is the known BUG-087 false fail. In the scratch clone, `tsc --noEmit` exits 0 at `ca2b644`, and `npm run prebuild`, which includes `build-codex-payload --check`, also exits 0. There is no structural signal behind the flag.

## Merge preview into cli `main`

- `main` (`0e60fbd`) is an ancestor of `ca2b644`.
- `git merge-tree --write-tree main story/STORY-062-04` exits 0 with tree `29fb404`, which equals `ca2b644^{tree}`.
- So DevOps's `--no-ff` merge is conflict-free, and `main` ends up with exactly the tree QA verified.
- `git log main..ca2b644` also lists the C4 merge commit `d6c74ac`. All of its content is already in `main` through the 02 and 03 merges, and the tree diff below shows only 04's files.

`git diff main..ca2b644 --stat` lists 11 files, all in §3.1: `plan.ts`, `serve.ts`, `render.ts`, both `sprint-dashboard/SKILL.md` copies, `plan.node.test.ts` and the five `plan*.red` files. `package.json` is unchanged.

## 1. EPIC-062 architecture rules

| Rule | Result | Evidence (`ca2b644`) |
|---|---|---|
| 1. One server | PASS | All changes are in `src/dashboard/**`. No new listener, port or daemon. |
| 2. Sprint tab / `SprintDashboardData` unchanged | PASS | `collect.ts` is not in the diff. `render()` only gains the optional `plan?` key and the `opts` parameter (`render.ts:1167`). `snapshot.ts:40 render(data)` and `sprint.ts:233 renderFn(data)` are untouched, so the snapshot gets the "only available from the live dashboard" panel and an empty token. |
| 3. Page never writes | PASS | The client's only write is `fetch('/plan')` with a relative URL (`render.ts` `cgPlanCommit`). `serve.ts:227/233` call `ctx.scopeHandlerFn`, which defaults to `sprintScopeHandler` (`:257`), in-process. `plan.ts` only reads. |
| 5. Frontmatter via the locator only | PASS | 04 writes no frontmatter. The real-handler probe below changed only `sprint_cleargate_id`, the list line and the stamps. |
| 6. Degrade, never throw | PASS | `collectPlan` has an outer try/catch (`plan.ts:229/291`) and a per-file diagnostic (`:281`). The client `cgRenderPlan` is wrapped in try/catch. A throw in the POST handler becomes a 500 through `.catch` (`serve.ts:330`), so the daemon survives. |
| 7. Loopback, token, Origin/Host | PASS | The server listens on `127.0.0.1` only (`serve.ts:423`). `planGuard` (`:125–140`) checks, in order: Host against the **live** port (`livePort`, `:327`), Origin when present (the literal `null` → 403), the JSON media type, the token with a length check plus `timingSafeEqual`, then Content-Length. A streamed body over 64 KiB also gets 403 (`:175`). No `Access-Control-*` header is ever sent. The token is in `GET /` only: my probe checked that `/data` does not contain it. |
| 8. No dependency, zero network | PASS | `node:crypto` is a built-in. `render.node.test` (the `http(s)://` ban) passes 31/31. |
| 9. node:test, port 0 | PASS | The endpoint and round-trip reds bind port 0 and read `server.address().port`. |

## 2. Integration commit `5dcae45`

- **The three conflicts were resolved as in M2 §A3.** In `serve.ts`, both imports are kept, `AddressInfo` first (`:32–33`). In the CSS, 01's tab-bar block comes first, then `/* STORY-062-04: Plan tab */` (`render.ts:297–317`). In the client array, the order is 02's backlog block, then `cgPlanToken` (`:1066`), then `PLAN_CLIENT` (`:1067`). Both stubs are gone.
- **Counts on the integrated tree.** The stub grep returns 0. There is one `function cgRenderBacklog(` and one `function cgRenderPlan(`. No client `function cg*` name is declared twice, and there are no conflict markers.
- **Nothing from 01 or 02 was lost.** `git diff main..ca2b644` removes only these lines:
  - in `render.ts`: the old `buildClientScript` signature, the `cgRenderPlan` stub, the `renderPlanPanel` stub body (3 lines), the `render` signature and the `<script>` line
  - in `serve.ts`: only C2's `GET /` and `GET /data` expressions
- **Untouched.** 01's header comment, sentinel removal, teardown and record writes are not changed. Neither are 02's backlog block, the poller line (`:1105`, which still calls `cgRenderBacklog` and `cgRenderPlan`), or `cgShowTab`.
- **CSS tokens.** Every `var(--cg-*)` in the plan block is defined in STYLE (`:123–129`). `cr102` passes 21/21.
- **Dev test hygiene.** `git diff 1624636 ca2b644 -- 'test/dashboard/plan*'` is empty, so the Dev added only its own `plan.node.test.ts`.

## 3. Stale-claim mirror (`plan.ts:64–76`) vs `sprint-scope.ts:436–455`

- **Faithful.** The same order applies: `findSprintPlanFile` null → `no sprint file`; status `Completed` → `completed`; under `delivery/archive/` → `archived`; anything else is open. The two read status the same way. `sprint-scope`'s `load()` throws on a missing frontmatter span, and `parseFrontmatter` (`parse-frontmatter.ts:24–28`) does too, through the same `locateFrontmatter`. Both treat a throw as `status = undefined`. The claim values are compared untrimmed on both sides.
- **The only divergence** is a whitespace-only `sprint_cleargate_id`. 02 keeps it, so the plan shows "claimed by ␠ (no sprint file)", while `isStr` skips the check. Both allow the add, so this is cosmetic only.
- **Real-data parity probe.** I copied OUTER's delivery tree, ran the real `sprintScopeHandler` with no-op stamp/gate/ingest seams, and restored the files after each add.
  - All 37 SPRINT-43 candidates that carry a foreign claim agree with `sprint add`: enabled rows get code 0 with the same `(X, reason)` pair; disabled rows get code 1 "already in X".
  - All 13 claimed items that are hidden (open claim, not carry-over) are refused by `add`, so none is hidden yet addable.
- **Cache scope is correct.** `claimCache` is created inside each `collectPlan` call (`:238`) and is never module-level, so a sprint closed between two polls flips its rows on the next `/data` (E3 green). `candidatesFor` builds new objects and never mutates the cached `BacklogItem`s from 02 (flashcard #dashboard #cache).
- **Divergence risk is acceptable until A-3.** E4 runs the real handler on the same tree. Any change to the handler's classification, including A-2 (Abandoned treated as stale), turns E4 step 2 red, so drift is caught at CI time rather than shipped.
- **Cost.** On the real repo (read-only), with 4 draft sprints and 14 distinct claims, `collectPlan` takes 22 ms cold and 12 ms warm. That runs once per `/data` request.
- **Real rows.** BUG-102 and BUG-106 are enabled with "claimed by SPRINT-41 (completed) — will be reassigned". CR-097 is enabled with "(no sprint file)". PROPOSAL-029 is disabled with `in SPRINT-29`.

## 4. R5 partial-write semantics (`serve.ts:218–246`)

- **Order and serialization.** `remove` runs first with the page's `expectSha`. `add` then runs with `r1.sha` (`:234`), or with the page sha when only `add` runs. The calls are serialized per server by `runSerial` (`:261–265`).
- **Response bodies.**
  - Success returns 200 with merged `changed`/`warnings` and the last call's `sha`.
  - A refusal of the first call returns 409/422 with no `partial`.
  - An `add` refusal after `remove` returns 409/422 plus `partial: {removed: r1.changed, sha: r1.sha}` (`:222`).
- **`r1.sha` is the final sha.** It is the hash of the raw bytes after stamp, gate and ingest (`sprint-scope.ts:669`), so the chained `add` passes its precondition.
- **Real-handler probe** (real `serve()` on port 0, on the copied tree):
  - Request: POST remove `CR-122` plus add `BUG-052` (open claim by SPRINT-42).
  - Response: 422 `{errors:["BUG-052 is already in SPRINT-42 — …"], partial:{removed:["CR-122"], sha}}`.
  - `partial.sha` equals the sha256 of the file on disk, and so does the next `/data` sha.
  - `/healthz` still answers after the gate and ingest steps, so the daemon was not killed.
  - `git diff` showed frontmatter-only edits: `sprint_cleargate_id`, the list line and the stamps.
- **Client.** It shows "Removed before the refusal: …" for both 409 and 422. A 409 sets `changedOnDisk`, so the Reload notice appears.

## 5. SKILL.md copies (R9)

- `cmp` shows the two copies are identical, and `build-codex-payload.mjs --check` exits 0. `codex-payload.red` passes 14/14.
- Commands, flags and the record path match the integrated `src/cli.ts:414–419` (`sprint add|remove <sprint-id> <ids...>`, `--expect`, `--json`) and `:460–524` (`cleargate dashboard` and the `sprint dashboard` alias with `--open`/`--serve`/`--stop`/`--port`). They also match `daemon.ts:64` (`.cleargate/.dashboard.json`).
- The text covers all four R9 points: the command, the three tabs, the sentinel valve being gone with the idle valve kept, and add/remove as the way to assemble a sprint.
- I found no `v1`/`v2` vocabulary.
- There are small doc nits (follow-up 3 below), none of them wrong instructions.

## Targeted tests (scratch clone, private short TMPDIR, one file per invocation)

All passed with 0 failures and 0 cancellations.

| Group | Files (pass count) |
|---|---|
| 04 | `plan-stale-claims.red` 4, `plan.red` 9, `plan-endpoint.red` 24, `plan-roundtrip.red` 2, `plan-tab.red` 14, `plan.node` 9 |
| 02 | `backlog.red` 18, `backlog-tab.red` 13, `backlog.node` 5 |
| 01 | `tab-shell.red` 13, `dashboard-lifecycle.red` 19, `serve.node` 2, `render.node` 31 |
| Guards and 03 | `cr102` 21, `no-inline-id-regex` 7, `codex-payload.red` 14, `commands/sprint-scope.red` 31 |

## Advisory (non-blocking; new Gate-4 follow-up candidates)

1. **Host allowlist on every route.** `GET /` and `GET /data` (`serve.ts:290/309`) check no Host header. A DNS-rebinding page could therefore read project data from `/data`, a read exposure that dates from CR-101. It could also read the token from `GET /`. The token cannot be used: the POST check requires a loopback Host, and a rebinding browser cannot forge one. Applying `planGuard`'s Host test to all routes closes the read path cheaply.
2. **`partial` when `remove` wrote nothing.** `serve.ts:222` attaches `partial` whenever `remove` ran, even when `r1.changed` is `[]`. R5 says "if `remove` wrote". The page cannot reach this case (it only removes current members); only a hand-made POST can. Gate it on `r1.changed.length > 0`.
3. **Doc drift nits** (bundle into one tidy-up):
   - the `disabled` JSDoc at `plan.ts:25` still says "claimed by another sprint"; it should say an *open* claim
   - the `serve.ts:1–8` header omits `POST /plan` (01's text; M2 told 04 not to edit it)
   - `SKILL.md:18` lists the dashboard files without `backlog`/`plan`
   - `SKILL.md:65` gives the record fields without `sprintId`
   - the `SKILL.md` mode table shows only the `cleargate sprint dashboard` forms, although `cleargate dashboard` is named primary

   A SKILL.md edit needs `npm run gen:codex`.
4. **`/data` payload.** `plan` carries the full candidate list for every draft sprint: about 100 KB of JSON on this repo (4 sprints × ~115 candidates), every 2 s, plus the embedded DATA blob. That is fine today. At scale, send candidates for the selected sprint only, or derive them client-side from `backlog`.
5. **Post-commit refresh.** The refresh after a commit calls `cgRenderApp` and `cgRenderPlan`, but not `cgRenderBacklog`. The Backlog tab's sprint column lags by at most one poll. Fold this into the queued "2 s whole-list backlog redraw" follow-up.
6. **Sha encoding mismatch (03's surface, low).** `sprint-scope.ts:396` hashes the utf8-decoded string, while `plan.ts:276` and `sprint-scope.ts:669` hash raw bytes. The two are identical for valid UTF-8. A sprint file containing invalid UTF-8 bytes would 409 on every Plan commit and every `--expect` taken from the page. The fix is to hash `readFileSync` bytes at `:396` too.

Owner-visible behaviour, not a defect (matches the R2 literal and QA's observation): an item that an open sprint claims and that is not carry-over is not listed at all. For example, BUG-052, claimed by SPRINT-42, is absent from SPRINT-43's picker. Showing such rows disabled would make the list more discoverable. That is an owner call.

The queued list (A-2, A-3, pid reuse on `.dashboard.json`, line-level stamp/gate writers, the 2 s backlog redraw, the duplicate dashboard registration in `cli.ts:460–524`) stands. I found nothing that changes its priority.

## Open decisions for orchestrator

None blocking. DevOps can merge `story/STORY-062-04` into cli `main` with `--no-ff`; the preview is conflict-free (tree `29fb404`). After that, run the full suite in the merge lane.

## Script Incidents

None. I invoked no wrapped script. I used `git merge-tree`, a scratch `git clone --shared`, `tsc`, `npm run prebuild`, `npm run test:file` and three `tsx` probes. Two probes wrote only to a git-tracked copy of the delivery tree in a private TMPDIR, which has since been removed. The third, the perf probe, read OUTER only.

flashcards_flagged:
- `2026-11-10 · #dashboard #security · Host-check every dashboard route, not only POST: GET / and /data are DNS-rebinding readable; the POST Host check is what protects the token.`
- `2026-11-10 · #sha #sprint-scope · Hash readFileSync bytes everywhere a sha is compared; sha256 of a utf8-decoded string differs on invalid UTF-8.`
