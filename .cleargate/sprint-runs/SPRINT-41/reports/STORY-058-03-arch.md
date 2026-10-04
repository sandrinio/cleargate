# STORY-058-03 — Architect post-flight

role: architect

Reviewed: cli `story/STORY-058-03`, `git diff a821d40..0fb61b1`: implementation `0fb61b1` on top of red `11fe514`. The references are `plans/M2.md` §STORY-058-03 as superseded by M2-A1..A8, M2-A14/A15, the TPV D1–D8 and the -03 reports.

Scope: architecture only. QA-Verify already covered the verbatim move hunk by hunk, the empty Q1 grep, 19/19 + 5/5, the bundled-dist double init and the regression witnesses, so I did not repeat any of them. I measured nothing in the main checkout. My only reads outside the repo were of the read-only baseline `/private/tmp/cg-s41-m2-init-baseline`: its `meta.json` and `tree/` files.

## 1. Conformance

### M2 §STORY-058-03 contract (story §3.3)

| Surface | Result | Evidence |
|---|---|---|
| `HostName`, `InstallCtx`, `RemoveCtx`, `RemoveReport`, `HostAdapter` | **Conformant.** The names, members, `readonly` modifiers and return types match the contract block. Only the doc comments were reflowed. The `pinVersion` doc cites `init.ts:542`, per M2-A3. | `src/hosts/types.ts:12-58` |
| `UnknownHostError` | **Conformant.** It has `name`, `host`, `valid`, and the message `Unknown host "${host}". Valid hosts: ${valid.join(', ')}.` | `registry.ts:21-31` |
| `HostRegistry`, `createHostRegistry`, `defaultHostRegistry`, `pathUnderRoots` | **Conformant.** It is `Map`-backed (`:63`) and enforces the duplicate-name rule (`:69`), the root shape (`:41-47`, `:76-82`), and owned roots against owned or shared roots (`:85-93`). It also checks shared roots against owned roots (`:95-104`). That is the symmetric half of the same invariant, needed because registration order is arbitrary. Shared-vs-shared overlap is allowed. `pathUnderRoots` is `rel === r \|\| rel.startsWith(r + '/')` (`:58-60`). | `src/hosts/registry.ts` |
| `ClaudeAdapterDeps`, `createClaudeAdapter`, `claudeAdapter`, `CLAUDE_HOOK_ADDITION` | **Conformant.** There are six `typeof` deps (`claude.ts:66-73`). `createClaudeAdapter(deps: Partial<…> = {})` merges each key over `DEFAULT_DEPS` (`:84-85`). The adapter is a plain object of closures with no class and no `this` (`:223-230`). `CLAUDE_HOOK_ADDITION` is typed `SettingsJson`, with its doc and BUG-089 comment (`:21-57`). | `src/hosts/claude.ts` |
| Claude declarations | **Conformant.** `ownedRoots` is `['.claude']`, `sharedRoots` is `[]`, and `surgeryTargets` is `['CLAUDE.md', '.claude/settings.json', '.mcp.json']`. Each call returns a fresh array. | `claude.ts:225-227` |
| `init.ts` routing | **Conformant with M2-A1/A2/A4/A5.** The seam is at `:226`, unconditional, before Step 1. The loop at `:426-432` sits inside the Steps-3–7 `try` (`:331` … `} finally {` `:602`), and no `exit()` is inside that try. The hoisted `let`s at `:258-261` are untouched. Exactly the four imports were deleted. The header now reads `4–5b.`. | `src/commands/init.ts` |
| Untouched files | Confirmed by QA. `git diff --stat` touches only `init.ts` plus the new `src/hosts/*` and test files. | — |

### TPV D1–D7

| Hint | Result | Evidence |
|---|---|---|
| D1: fallback as constants | Honoured. | `claude.ts:126` |
| D2: `d.*` everywhere | Honoured. All six helpers are called through `d.` in `install` (`:101`, `:123`, `:133`, `:169`) and `remove` (`:195`, `:209`). | — |
| D3: plain, unfrozen object | Honoured. `t.mock.method(claudeAdapter, 'install')` works, and so does the M2-A15 witness for -04. | `claude.ts:223-233` |
| D4: import direction | Honoured. The chain is `init.ts → hosts/registry.ts → hosts/claude.ts → {init/*, lib/*}`. `claude.ts` imports only the `type` from `./types.js`. There is no cycle. | — |
| D5: destructure `ctx` | Honoured. | `claude.ts:88`, `:187` |
| D6: keep `writeAtomic` and `extractSessionLoadDelta` in `init.ts` | Honoured. `writeAtomic` is at `:192`, used by Steps 5c, 5d and 7. The banner is at `:731`. | — |
| D7: verbatim warning strings, no trailing `\n` | Honoured. | `claude.ts:199`, `:213` |

### Rulings on QA's three advisory textual differences in `remove()` vs `uninstall.ts:434-456`

1. **Existence check restructured** (`claude.ts:192-193`, where `uninstall.ts` has `if (claudeMdContent !== null)`). **ACCEPTED, no change.**
   - The upstream variable (`uninstall.ts:327-331`) belongs to the pre-validation that the plan keeps in `uninstall.ts`.
   - M2's `remove()` prose ("If `CLAUDE.md` exists, write `removeBlock(content)`") specifies exactly this shape.
   - The read sits outside the `try` in both files, so error propagation is unchanged. See follow-up FU-2 for why that matters from -05 on.
2. **`'utf8'` vs `'utf-8'`** (`claude.ts:207` vs `uninstall.ts:449`). **ACCEPTED, no change.**
   - Node normalizes both to the same encoding, so bytes and behaviour are identical.
   - Churning the line would buy nothing.
3. **Sync vs async `writeAtomic`** (`claude.ts:196`, `:210`). **ACCEPTED, no change.**
   - M2-A3 sanctions exactly one private sync copy (`init.ts:228-232`) shared by `install` and `remove`.
   - The atomicity is identical: a temp file in the same directory, then `renameSync`.
   - `remove()` still returns a `Promise`, so moving to async I/O later is invisible to callers.

## 2. Fitness for what comes next

No contract shape forces a later **breaking** change. Every need below is met either by the shape as built or by an optional (additive) member. Two conventions the contract leaves implicit will bite -05 and -10 unless someone writes them down. They are FU-1 and FU-4.

| Consumer | Needs | Verdict |
|---|---|---|
| **-04** `selected.map(registry.resolve)` | a `this`-free `resolve` | **Fits.** `resolve` is an arrow closure (`registry.ts:115`), so the point-free form works on the production registry. -04 still writes `(n) => registry.resolve(n)` (M2-A9), because a class-based test fake would lose `this` in the point-free form. |
| **-04** `payloadFilter(registry, selected)` | every registered adapter's owned and shared roots | **Fits.** It enumerates with `names().map((n) => resolve(n))` plus `ownedRoots()`/`sharedRoots()`, and uses `pathUnderRoots` for membership. With registry = {claude}, it is the identity after `SKIP_FILES` (`copy-payload.ts:131`). |
| **-04** `copyPayload` `include` | copier-side only | **Fits.** It does not touch the contract. |
| **-05** `logPrefix` | `InstallCtx.logPrefix?` | **Fits, additive.** It is optional, so `init` passes nothing and the bytes are unchanged. The literal sites are T3. |
| **-05** `host add` | `resolve`, roots, `install` | **Fits.** |
| **-05** `host remove` | `adapter.remove` after the file unlinks and before the snapshot rewrite | **Fits the shape, with two unwritten conventions:** the sink convention (FU-1) and "remove never rejects" (FU-2). |
| **-06** owner | owner derived from the scaffold root key, never from the adapter | **Fits.** `HostName` covers the host owners. `pathUnderRoots` is what the -06 snapshot filter needs through `payloadFilter`. |
| **-07** adapter `remove` in `uninstall` | the labels and warnings of `uninstall.ts:441/455` | **Fits.** They are byte-identical (D7), and `uninstall`'s own line sinks match `remove()`'s no-`\n` strings. |
| **-07** `displayName`, `sessionLoadedPaths`, `mergeSurgeryTarget` | new **required** members | **Fits.** `tsconfig.json` `include: ["src/**/*"]` and `exclude: ["**/*.test.ts"]` mean test fakes are never type-checked (`host-adapter-contract.red.node.test.ts:35-56` uses its own `HostAdapterLike`). The only real implementer is `claudeAdapter`. **Constraint:** `createHostRegistry` must never validate the new members at runtime, or the sealed -03/-04/-05 fakes (for example scenario 2's `makeFakeAdapter`) will throw. |
| **-07** `supersedeHookCommands` in `install()` | an insertion point | **Fits, but M3's literal wording is wrong for the as-built variable.** See T4 in the M3 append: a new `const`, never a reassignment of `existingSettings`. |
| **-10** codex adapter | `AGENTS.md` block, `.codex/hooks.json` merge, `.codex/config.toml` registration, owned `.codex`, shared `.agents`, `pinVersion` | **Fits.** It has one hazard outside the contract (FU-4). `InstallCtx.payloadDir`'s doc ("core + claude") goes stale for a codex view; it is a doc-only fix in -10. The `remainingHosts` question for an `AGENTS.md` shared with Copilot is additive (`RemoveCtx.remainingHosts?`) and moot until Copilot registers (FU-6). |

## 3. Defects QA missed

None is blocking. None changes Claude-observable bytes today.

1. **`init --force` rewrites `.claude/settings.json` wholesale and loses user hooks. This contradicts the new `surgeryTargets()` contract doc.**
   - `types.ts:49-53` says "No lifecycle command deletes one wholesale."
   - The baseline's `force/tree/.claude/settings.json` holds the payload's 7 hooks and **no** `echo user-owned-hook`, whereas `user-content`'s seed survives. The copier overwrites the file (`copy-payload.ts:203`, the force path) before `install()`'s merge runs.
   - This behaviour predates the refactor, and Rule 2 correctly preserved it byte-for-byte. The contract's doc comment is now aspirational, not descriptive. That matters because -05, -07 and -10 will read the doc as a guarantee. Routed as FU-3.
2. **`remove()` reads `CLAUDE.md` outside its `try`** (`claude.ts:193`), so an unreadable file (EISDIR/EACCES) rejects the promise.
   - This is behaviour-equal to `uninstall.ts:331`, which also has no `try`, and it is not a regression.
   - From -05 on, though, `executeHostRemoval` runs `remove()` **after** unlinking files and **before** rewriting the snapshot. A reject there leaves a snapshot that lists deleted files. Routed as FU-2.
3. **`names()` and `UnknownHostError.valid` return the registry's internal mutable `order` array** (`registry.ts:114`, `:118`). `readonly` is compile-time only, and tests and `.mjs` callers are not type-checked. A consumer that sorts or pushes onto `names()` would reorder the registry. Nothing does that today. Routed as FU-5.

## 4. Follow-ups

| # | Follow-up | Routed to |
|---|---|---|
| FU-1 | Write down the sink convention in `types.ts`. **`InstallCtx.stdout/stderr` are raw writers**: the callee includes `\n`, per init (`claude.ts:97-182`). **`RemoveCtx.stdout/stderr` are line sinks**: the callee omits `\n`, per `uninstall.ts:256-257`, which appends it, and `claude.ts:199/213`. `executeHostRemoval` wraps its raw writer as `(s) => raw(s + '\n')` when it calls `adapter.remove`. The -10 codex `remove()` emits strings without `\n`. | **STORY-058-05** (it already edits `types.ts` for `logPrefix`; blueprint change in the M3 append, T4) |
| FU-2 | Contract rule: "`remove()` never rejects on a per-target I/O error; it warns on `stderr` and continues." In `claude.ts`, move the `readFileSync` at `:193` inside the `try` at `:194`. The warning then covers read failures. The strings are unchanged. | **STORY-058-05** |
| FU-3 | Make the `surgeryTargets()` doc true, or narrow it. Either `init --force` stops wholesale-overwriting `.claude/settings.json` (it would merge instead), which is a Claude-observable change needing its own item and Rule-2 sign-off, or the doc says "except `init --force` for payload-shipped targets". -07 narrows the doc now, and the behaviour question goes to a follow-up item at close. | **STORY-058-07** (doc) + **close** (behaviour CR) |
| FU-4 | Top-level block sources must never be copied wholesale. `copy-payload.ts:63` hardcodes `SKIP_FILES = {'CLAUDE.md', 'MANIFEST.json'}`. A codex `AGENTS.md` at the payload root would be copied over the user's `AGENTS.md`, and so would any `.codex/hooks.json` under `--force` (same mechanism as defect 1). -10 excludes every registered adapter's surgery targets that lie under no owned root from `payloadFilter`. That is byte-neutral for Claude: `CLAUDE.md` is already skipped and `.mcp.json` is not in the payload. -10 also states the force semantics it wants for `.codex/hooks.json`. | **STORY-058-10** |
| FU-5 | `createHostRegistry` returns a frozen copy of `order` from `names()`, and the same frozen array for `.valid`. It is byte-neutral, and the sealed tests compare with `deepEqual`. | **STORY-058-04** (it edits `registry.ts` for `payloadFilter`) |
| FU-6 | Handle a shared surgery target (a Codex and Copilot `AGENTS.md` block) through an optional, additive `RemoveCtx.remainingHosts?: readonly HostName[]`, so one host's `remove()` does not strip a block another installed host still needs. It is moot at SPRINT-41 close: Copilot is deferred and `AGENTS.md` has one owner. | **close** (the deferred Copilot adapter item) |
| FU-7 | Two stale doc anchors are harmless. `types.ts:19` cites `init.ts:542` (`pinVersion ?? 'latest'` is now `init.ts:430`), and `InstallCtx.payloadDir`'s "core + claude" wording is wrong for a codex view. Replace each with a grep key or a neutral wording when the file is next touched. | **STORY-058-05** (the `:19` anchor) + **STORY-058-10** (the `payloadDir` doc) |
| FU-8 | The Task Breakdown boxes in the story file were left unticked because the dispatch scoped out outer edits (QA finding 1). | **close** (orchestrator ticks at the boundary step) |

## 5. Flashcards

flashcards_flagged:
  - "2026-09-25 · #host #contract · InstallCtx sinks are raw (callee writes \\n); RemoveCtx sinks are line sinks (uninstall appends \\n). Wrap when crossing."
  - "2026-09-25 · #init #settings-json #danger · init --force overwrites .claude/settings.json wholesale; user hooks lost despite the surgeryTargets doc."
  - "2026-09-25 · #test-harness #init · runInitScenario('reinit') primes with NO extra seams (init-fixture.ts:273); a seamed reinit tests only pass 2."
  - "2026-09-25 · #host #copy · copy-payload SKIP_FILES hardcodes CLAUDE.md; a new host's root block source (AGENTS.md) is copied wholesale."
  - "2026-09-25 · #settings-json #init · Never reassign existingSettings before the merge: the restart-banner delta base must stay the on-disk parse."

## Script Incidents

None. I invoked no wrapped script. The only executions were read-only: `git show`/`diff`/`grep` in the cli repo, `node -e` JSON/sha256 probes, and `shasum` on the read-only baseline.

ARCH=PASS
