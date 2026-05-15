role: architect
# STORY-027-03 SPRINT-27 — Architect Post-flight Pass

```
ARCH-PASS: APPROVED
```

NOTES:

All ten verification items pass against the actual diffs in inner commit `80e1a08` and outer commit `e50869a`. Module structure in `mcp/src/lib/payload-contract.ts` matches plan §3 — `ORIGIN_CLEARGATE_CLI` const + `originRequiresGates(origin)` appended after `semverLt` at lines 89-115, no breaking changes to -01/-02 exports (TYPE_REGEX, normalizeType, KNOWN_TYPES, ValidationError, RESERVED_PAYLOAD_KEYS, MAX_PAYLOAD_BYTES_DEFAULT, semverLt all intact). The helper hardens against runtime non-string origin via the typeof check at push-item.ts:221 — exceeds the Zod-pass-through defense called out in M2 risks §340.

`push-item.ts` wraps BOTH the approved-gate block (line 228) AND the cached_gate_result block (line 247) in `originRequiresGates(effectiveOrigin) && !ctx.skipApprovedGate`. The `else if (ctx.skipApprovedGate === true)` branch at line 232 fires the once-per-process `console.warn` keyed by `'approved-gate'` in the module-level Set. Deprecation comment on the `skipApprovedGate` interface field (line 32-37) explicitly says "Kept as a one-minor alias for backward-compat (STORY-027-03 R4). Remove in SPRINT-28+." — matches plan R4 exactly.

Advisory dual-case strip at lines 297-313: regex `/^\[advisory: gate_failed — [^\]]+\]\n/` for body-start case, regex `/^(# [^\n]*\n)\[advisory: gate_failed — [^\]]+\]\n/` for the post-H1 case with `$1` capture-group preservation. Em-dash literal verified as U+2014 (copied from the writer at line 296 `[advisory: gate_failed — ${criteriaStr}]`). The fallback `bodyAfterStrip = rawBody` handles the no-existing-advisory case cleanly. After strip, the existing H1-match + prepend logic runs against `bodyAfterStrip` — guarantees exactly one advisory line at top after re-push, regardless of whether the prior push placed it pre- or post-H1.

`sync-status.ts:48-58` migrated correctly: `nextPayload` extends `basePayload` with `status: args.new_status` AND `origin: 'system:sync-status'`. `stripReserved` helper is preserved (line 38 + applied at line 49). The inline comment at line 52 confirms "origin key is set AFTER stripReserved so it cannot be blocked by the reserved-key check" — defensive ordering against -02's RESERVED_PAYLOAD_KEYS check. `skipApprovedGate: true` removed from ctx spread at line 56; ctx now passes through bare `{ ...ctx }`.

`register-tools.ts:108-120` defense-in-depth stamp builds `stampedArgs` immutably (spread of args + spread of payload + `origin: args.payload['origin'] ?? 'cleargate-cli'`), then passes `stampedArgs` instead of `args` to `pushItem`. Idempotent — pre-existing user-set origin survives. Telemetry-only as planned; the gate-firing semantic is already enforced by `originRequiresGates` defaulting missing origin to cleargate-cli.

`cleargate-cli/src/commands/push.ts:232-236` (outer commit `e50869a`) stamps `payloadForPush['origin'] = 'cleargate-cli'` only when undefined — respects user-set origin per R8. Placement is immediately before the `mcp.call` invocation, after `body` injection. The stamp uses a literal string rather than importing the const from mcp (cross-package boundary correctly avoided).

`pull-item.ts:26-36`: `ItemNotFoundError.code` changed from `'not_found'` to `'item_not_found' as const`; `readonly hint: string` added with constructor body `this.hint = 'push it first, or check the cleargate_id'`. Messages also tightened (`no item with cleargate_id '<id>'`) — matches plan R7 prose.

Grep audit: `grep -rn "skipApprovedGate: true" mcp/src/ | grep -v "\.test\." | grep -v "node.test"` returns ZERO hits. Production callers fully migrated. The type-definition field remains in the PushItemContext interface (line 38) intentionally as the deprecated alias surface — this is expected per R4's one-minor retention.

No new dependencies in either `mcp/package.json` or `cleargate-cli/package.json` (verified by empty git diff against the pre-story baselines `51c432c` and `50f415e` respectively).

Hand-off to -04 ready: `payload-contract.ts` ends cleanly at line 115 after `originRequiresGates`, leaving an unambiguous append slot for CLEARGATE_ID_TYPE_REGEX, CLEARGATE_ID_NUMERIC_REGEX, isKnownIdFormat, and the Warning type. The chain-symbol-map contract from M2 §33-44 is intact through three serial waves.

STRUCTURAL_DEBT:

- `cleargate-cli/src/commands/push.ts:235` uses the literal `'cleargate-cli'` instead of importing `ORIGIN_CLEARGATE_CLI` from the mcp contract. Cross-package boundary correctly avoided (no inner→outer import in this direction either), so this is a string-drift hazard if the canonical origin value ever changes. Mitigation: add a comment cross-referencing `mcp/src/lib/payload-contract.ts ORIGIN_CLEARGATE_CLI` so a future rename surfaces both sides. Defer to a future hygiene CR — not blocking for -04.
- The `skipApprovedGate` deprecation Set (`_deprecatedSkipApprovedGateSeen`) is module-level state. Process-lifetime warn-once is the spec — but if any future test imports the module via dynamic-import to re-trigger the warning, the Set survives across tests. Acceptable per R4 ("warning fires at most once across the process"), but flag for SPRINT-28+ removal pass.
- Test files retain `skipApprovedGate: true` usages (8+ hits per plan §338) regression-protecting the alias path. These remain alive for one minor. -04 must NOT delete them; the SPRINT-28+ removal pass owns that cleanup.

DEVIATION_VERDICTS:

- advisory-dual-case: ACCEPT — Dev's implementation covers both body-start AND post-H1 advisory positions with two distinct regexes plus a no-op fallback. This is MORE robust than the M-plan's single-regex spec at §266-272 (which only handled the body-start case explicitly). The dual-case treatment is the correct interpretation of R6 "idempotent on re-push" given that the writer places advisory after H1 when an H1 exists — without the post-H1 strip case, re-pushes against H1-prefixed bodies would have stacked advisories. Dev surfaced and solved a wiring trap the plan missed.
- cli-push-stamp: ACCEPT — placement at push.ts:232 (before `mcp.call`) is correct; idempotent guard `if (payloadForPush['origin'] === undefined)` respects user-set origin per R8; literal `'cleargate-cli'` is the right choice given no cross-package import path exists. Plan §301-303 specified this verbatim — Dev matched exactly.
- direct-commit-procedural: ACCEPT (note: -04 must use worktree) — The outer-repo edit landed via direct commit `e50869a` on `sprint/S-27` rather than through the `story/STORY-027-03` worktree branch (which remains at baseline `50f415e`). Worktree-isolation hygiene was violated, BUT the commit IS on the correct merge target and is byte-correct against the plan. Two contributing factors: (1) the outer edit is a 6-line patch in a different package than the inner mcp branch, and (2) the story's primary worktree was inner-mcp scoped. Accept this case; require STORY-027-04 to land all surfaces (mcp/ inner + cleargate-cli/ outer + mcp/src/db/ migration + mcp/src/middleware/) through ONE coherent branch — preferably a single `story/STORY-027-04` worktree at the outer repo root that can touch both packages atomically. The orchestrator should pass an explicit reminder in the -04 dispatch to use a single worktree branch and rebase once before commit. If -04 spans two physical repos again, the worktree MUST be at the outer repo (where both `cleargate-cli/` and `mcp/` are visible as subtrees) — never at the nested `mcp/` repo, which cannot see `cleargate-cli/` changes.

HANDOFF_TO_004: ready

The contract surface in `payload-contract.ts` is clean, the four-check + gate-policy + advisory + structured-404 ground is solid, and the chain symbol map for -04 (CLEARGATE_ID_TYPE_REGEX, CLEARGATE_ID_NUMERIC_REGEX, isKnownIdFormat, Warning type) has its append slot at line 116 with no neighboring symbols to disturb. STORY-027-04 may proceed.
