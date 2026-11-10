# STORY-062-05 — Architect Post-Flight (§C.6)

role: architect

**Verdict: ARCH: PASS**

I reviewed cli `story/STORY-062-05` at `a4ddda5`: QA-Red `7299d64` plus Dev `a4ddda5`, on base cli `main` `8f71c87`.

The real worktree and the cli main checkout were left alone. Both `git status --porcelain` outputs are empty before and after the review, and the refs are unchanged (`main` = `8f71c87`, story = `a4ddda5`). Every build, test and probe ran in a scratch `git clone --shared` with `node_modules` symlinked and a private short TMPDIR. Both have since been deleted, and no probe listener was left open.

## Dispatch flag: `typecheck: exit code 254`

This is the known BUG-087 false fail. `tsc --noEmit` exits 0 at `a4ddda5` in the scratch clone (4.4 s). The scan's other checks (`new_deps`, `stray_env_files`, `qa_red_lint`) passed, and the structural review below found nothing behind the flag.

## Merge preview into cli `main`

- `main` (`8f71c87`) is an ancestor of `a4ddda5`. No integration is needed (rule 13: no upstream, and `main` has not moved).
- `git merge-tree --write-tree main story/STORY-062-05` exits 0 with tree `c770761`, which equals `a4ddda5^{tree}`. The `--no-ff` merge is conflict-free, and `main` will end up with exactly the tree QA verified.
- `git diff main..a4ddda5 --stat` lists 5 files, all in §3.1: `collect.ts`, `serve.ts`, `render.ts`, `ticket-view.red.node.test.ts` and `host-guard.red.node.test.ts`. `package.json` is unchanged.
- `git diff 7299d64 a4ddda5` touches `src/` only, so the Dev did not edit the red files.

## 1. Conformance to M3

| M3 point | Result | Evidence (`a4ddda5`) |
|---|---|---|
| `capDoc` + `MAX_DOC_CHARS` exported; one cap | PASS | `collect.ts:222`, `:225-227`. `readDeliveryDoc` `:234` and `readExecutionLog` `:244` call `capDoc`. It uses the same `40000` and the same U+2026 suffix, so Sprint-tab output is byte-identical (`collect.node` 19/19). `collect()` is otherwise untouched (Rule 2). |
| `hostGuard` exported, exact allowlist | PASS | `serve.ts:129-133`. It is the same expression as the old `planGuard` Host lines, including lower-casing. |
| Guard first: before collectors and before the idle clock | PASS | `serve.ts:331-336` runs before `lastRequestAt = Date.now()` at `:337` and before any route. It uses `livePort(server, boundPort)`, so with `port: 0` it checks the real bound port (H3). `req.resume()` drains a refused body (H6). |
| `planGuard` delegates; remaining checks byte-identical | PASS | `serve.ts:137-138` calls `hostGuard` first. In the diff, the only removed lines are the `hosts` array, the `host` extraction and its `if`. The Origin, content-type, token (`timingSafeEqual`) and size checks and their four 403 strings are unchanged (H4 ×4; `plan-endpoint.red` 24/24). |
| `/doc` lookup bounded to `collectBacklog` items | PASS | `serve.ts:275` is an exact `items.find((i) => i.id === id)`. The only read is `path.join(cwd, item.file)` (`:282`). `readDeliveryDoc` is not used (flashcard #dashboard #security). The response is `renderMarkdown(capDoc(raw))` (`:287`). |
| Route try/catch; GET only; exact path match | PASS | `serve.ts:372-379`. The match is `url === '/doc' \|\| url.startsWith('/doc?')`, so `/docs` and `/doc/x` are not caught. It is GET-only, so `POST /doc` → 404 (A9). A throwing collector gives 500 `internal error:` and `/healthz` still answers afterwards (A8). |
| Client: buttons, `cgModalSeq` placement, `cgFindDoc`, `cgOpenItem` | PASS | Buttons: Backlog row `render.ts:1019` (covers child rows through `cgBacklogRow`) and Plan row `:628` (last child, no `<label>`). `var cgModalSeq = 0;` is at `:838`, directly after `let cgLatestData = DATA;`. `cgFindDoc` returns null for `item:` (`:851`). The `item:` branch is at `:859-860`, and `cgOpenItem` at `:866-882` matches M3 verbatim. |
| Two delegated-handler early returns | PASS | Backlog `render.ts:1082`, Plan `:707`. B3a and B3b kill a mutant that drops either one. |
| CSS | PASS | One line in the global STYLE (`render.ts:227`), margin only. There is no new token, shadow, radius or `<script>` (`cr102` 21/21, `backlog-tab.red` 13/13). |
| Deviations | none | This matches the Dev report. No `sentinelIntervalMs` was added (flashcard #test-harness #dashboard). |

## 2. Security

- **Host comparison.** The raw-socket probe against a guarded server on port Q gave:

  | Host header | Result |
  |---|---|
  | `127.0.0.1:Q` | 200 |
  | `localhost:Q` | 200 |
  | `LOCALHOST:Q` | 200 |
  | `127.0.0.1` (no port) | 403 |
  | `localhost` (no port) | 403 |
  | `[::1]:Q` | 403 |
  | `0.0.0.0:Q` | 403 |
  | `localhost.:Q` | 403 |
  | `evil.example` | 403 |
  | `evil.example:Q` | 403 |

  - **No Host header.** An HTTP/1.0 request without Host gets 403. An HTTP/1.1 request without Host gets 400 from Node itself.
  - **Duplicate Host headers.** With the evil one first, the result is 403 (Node keeps the first).
  - **Absolute-form request line.** With an evil Host, the result is 403. With a loopback Host, it falls through to 404.
  - **`OPTIONS` preflight with an evil Host.** 403, and no `Access-Control-*` header is ever sent.
  - **`[::1]` is absent by design.** The server binds `127.0.0.1` only (`serve.ts:480`), so `[::1]` cannot connect at all.
  - **Story §2.2 curl.** `-H 'Host: evil.example'` on `/data` gives 403. This is the `evil.example` row above.
- **Path traversal.** None of these query values matched an id; each returned 404 `unknown id`: `BUG-106%00`, `bug-106`, ` BUG-106`, `BUG-106/../BUG-106`, `%2e%2e%2fBUG-106`, `BUG-106_x` (the filename stem) and `BUG-106_x.md`. The A5 rows also pass: `SPRINT-44`, `NOPE-1`, plain and encoded `../../etc/passwd`, empty, bare `/doc` and archived. `item.file` is `path.relative(cwd, abs)` of a `readdirSync` entry of `pending-sync` (`backlog.ts:118`, `:135-149`), so it cannot leave that directory.
- **HTML injection.**
  - **Server body.** A fixture body containing `<script>alert(1)</script>` came back from `/doc` only escaped (`&lt;script&gt;`). `renderMarkdown` escapes all input before transforming it (`markdown.ts:11-14`), and links are limited to an allowlist of schemes (`:43`).
  - **Client error line.** It goes through `cgEsc` (`render.ts:871`).
  - **Modal title.** It is set with `textContent`.
  - **`data-doc-key`.** The attribute is built with `cgEsc`, which escapes `"` and `'` (`:803`).
- **Token.** It is still only in `GET /`. My probe found the 64-hex token in neither `/doc` nor `/data`.
- **Idle clock.** QA only inspected this; I probed it. With `idleMs: 1500`, a foreign-Host request every 250 ms did **not** keep the server alive: it exited at 1501 ms. Loopback polling at the same rate kept it alive for the whole 3.6 s window. So a DNS-rebinding page cannot keep an orphan daemon alive.

## 3. Client

- **View buttons in all three row kinds.** They appear on top-level and child Backlog rows (one `cgBacklogRow` edit) and on every Plan candidate, including disabled rows. The fallback child row for an id missing from `items` correctly has no button.
- **The Plan button is never inside a `<label>`.** The only `<label>` in the Plan panel is the picker's (`render.ts:1179`), and no `<form>` exists, so a `.doc-btn` without `type="button"` cannot submit anything.
- **Early returns plus structure.** The `.doc-btn` handler (`:1119-1123`) opens the modal. The Backlog and Plan handlers return early, and the button is never inside `[data-bl-epic]`, `[data-plan-children]`, `#plan-commit` or `#plan-reload`. The filter-chip handler (`:1107`) acts only on `.filter-chip`.
- **Stale-response guard.** Every `cgOpenModal` call bumps `cgModalSeq`, and both the success and failure paths check `seq === cgModalSeq` (`:871`, `:876`). A late response after the modal has closed writes into the hidden body and never un-hides it (B5).
- **The poll never clobbers an open modal.** `cgRenderApp`, `cgRenderBacklog` and `cgRenderPlan` never touch `#cg-modal*` (B6).
- **cr102.** Satisfied, as in §1.
- **Snapshot (`file://`).** It has no backlog or plan data, so no item button can render offline.

## 4. Daemon and probe interplay

I ran a real two-root probe on the story tree:

| Step | Setup | Result |
|---|---|---|
| Foreign walk | A foreign ClearGate dashboard (root B, guarded) listens on P. `serve({cwd: A, port: P, autoPort: true})` is started. | It got EADDRINUSE, then `probeHealthz(P)`. The foreign server's guard passes, because the probe's Host is `127.0.0.1:P` on its own live port. It answers `root: B`, so `isOurs` is false and the walk moves to **P+1**. |
| Port search | `findPort(P, A, 4)` | `{port: P+1, reusable: true}`: P is skipped as foreign, and P+1 is recognised as ours. |
| Adopt | A second `serve({cwd: A, port: P+1})` | It logged "Dashboard already running … (reusing it — no new tab)" and called `exitFn(0)`. |
| Fail-safe | (reasoning, not run) | Even if a guard ever refused a probe, the 403 body `{ok:false,…}` parses as JSON with no `service`. `isOurs` is then false, so the port counts as foreign and the walk goes on. A refusal therefore can never break the walk; at worst it fails to adopt. Adoption cannot be refused in practice, because the probe always targets the port the server is bound to. |

`probeHealthz` (`daemon.ts:157-158`) is the only HTTP client of the dashboard in `src/`. The token-ledger hook only runs `cleargate sprint dashboard` and makes no HTTP call. `cr101` 24/24, `dashboard-lifecycle.red` 19/19 and H5 are green.

## Targeted tests

These ran in the scratch clone through `run_script.sh`, one file per invocation. All passed with 0 failures and 0 cancellations.

| Group | Files (pass count) |
|---|---|
| 05 | `ticket-view.red` 24, `host-guard.red` 27 |
| 04 | `plan-endpoint.red` 24, `plan-roundtrip.red` 2, `plan-tab.red` 14 |
| 02 | `backlog-tab.red` 13 |
| 01 | `tab-shell.red` 13, `dashboard-lifecycle.red` 19, `render.node` 31 |
| Guards | `cr101` 24, `cr102` 21, `collect.node` 19, `no-inline-id-regex` 7 |

I skipped `cr097` because it binds fixed port 4731. QA and the Dev both ran it at 13/13.

## Advisory (non-blocking; new Gate-4 follow-up candidates)

1. **Raise the priority of the queued "backlog 2 s redraw" item.** `cgRenderBacklog` calls `cgRenderBacklogList()` on every poll (`render.ts:1070`), which rewrites `#backlog-list` and so replaces every view button every 2 s. This has two effects:
   - A keyboard user who has tabbed to a view button loses focus every 2 s.
   - A click whose mousedown and mouseup fall on either side of a rewrite can be lost.

   The Plan list does not have this problem, because it re-renders only when `lkey` changes. The view buttons make this user-visible, so key the Backlog redraw the same way.
2. **`--port 80`.** Browsers and curl leave the default port out of `Host`, so on port 80 they send `localhost` or `127.0.0.1` with no port. The guard requires `host:port`, so a dashboard on port 80 would answer 403 to every page load. `--port` is a bare `parseInt` (`cli.ts:467`, `:499`). The fix is either to refuse 80 at the CLI or to allow a bare host when `port === 80`. This is low priority; the default is 4713.
3. **Doc tidy-up (fold into the queued item).**
   - In the `serve.ts:7-8` header, the new "Every route first passes hostGuard" sentence sits inside the route list, between `/doc` and `/healthz`. The list still omits `POST /plan` (04 nit).
   - `SKILL.md:110` still describes Host/Origin as a `POST /plan`-only guard and does not mention `/doc`. This is already queued.
4. **Accessibility nit.** Every row button's accessible name is "view". An `aria-label="view <ID>"` would tell screen-reader users which item it opens. Very low priority.
5. **Test hygiene (pre-existing on `main`, not 05).** `test/dashboard/collect.node.test.ts:20` creates `cg-dashboard-collect-*` temp directories and never removes them; 10 were left after one run. Add an `after` hook that calls `rmSync`.

The queued list stands: A-2, A-3, pid reuse, line-level stamp/gate CR, the backlog 2 s redraw plus post-commit refresh, partial-when-unchanged, the doc tidy-up (SKILL.md `/doc` and the all-route guard), `/data` plan size, the sha encoding at `sprint-scope.ts:396`, and the `cli.ts` duplicate dashboard registration for D.5. Item 1 above raises the redraw item's priority. Nothing else changes.

## Open decisions for orchestrator

None blocking. DevOps can merge `story/STORY-062-05` into cli `main` with `--no-ff`; the preview is conflict-free (tree `c770761`). Then run the full suite in the merge lane. The orchestrator ticks the four Task Breakdown rows at merge (rule 15).

## Script Incidents

- `.cleargate/sprint-runs/SPRINT-44/.script-incidents/20261110T095451Z-29e73182b462.json` is mine. A scratchpad probe saved as `.ts` hit tsx's CJS transform ("Top-level await is currently not supported"). I re-ran it as `.mts`, and that run passed. This was a probe-authoring error, not a product issue.
- `20261110T095036Z-c9d056115a54.json` is the orchestrator's `pre_gate_runner.sh arch` run that raised the BUG-087 flag. It is not mine.

flashcards_flagged:
- `2026-11-10 · #dashboard #client · cgRenderBacklogList rewrites #backlog-list every 2 s poll; row buttons lose focus/clicks — key the redraw like Plan's lkey.`
- `2026-11-10 · #dashboard #security · Host allowlist is host:port; browsers omit :80, so a dashboard on port 80 would 403 every page — refuse 80 or allow bare host.`
