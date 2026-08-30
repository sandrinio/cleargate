---
bug_id: BUG-055
parent_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P1-High
reporter: architect
approved: false
area: planning-layer
context_source: verified codebase grounding — measured by executing pushHandler against a tmpdir SPIKE charter during the STORY-054-02 Architect post-flight (SPRINT-39 wave 4); no prior approval, filed for triage
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 3a114e9c-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-055: A spike charter pushes successfully under the literal cleargate_id "unknown"

### Open Questions

- **Question:** Should the fix also add the three other missing keys (`initiative_id`, `hotfix_id`, `sprint_id` where absent) to `getItemId` and `resolveLocalItem`, or only `spike_id`?
- **Recommended:** Add all of them in `getItemId` and `resolveLocalItem`. `initiative_id` and `hotfix_id` are currently unreachable only because `getItemType` rejects them first; the moment [[BUG-051]] closes that map, they inherit this exact defect. Fixing one key leaves the trap armed for the next type.
- **Human decision:** {populated during Brief review}

- **Question:** Should `getItemId` return `null` and hard-error instead of the sentinel string `'unknown'`?
- **Recommended:** Yes. The `'unknown'` sentinel is what converts a missing registration into a silent wrong-write. `getItemType` already returns `null` and the caller already has an `exit(1)` path for it (`push.ts:253-257`); `getItemId` should use the same shape.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `cleargate push .cleargate/delivery/pending-sync/SPIKE-001_Foo.md` sends `cleargate_id: "SPIKE-001"`, `type: "spike"` to `push_item`, and the server stores the charter under `SPIKE-001`.

**Actual Behavior:** The push **succeeds** and sends `cleargate_id: "unknown"`, `type: "spike"`. Exit code 0. stdout reads `push: unknown → version 1 (pushed_by: …)`. The sync-log entry records `"target":"unknown"`. The server accepts it — a non-conforming `cleargate_id` is only an **advisory warning** server-side (`mcp/src/tools/push-item.ts:356-362` `unknown_id_format`), not an L1 error — and inserts a row with `cleargateId = 'unknown'` (`push-item.ts:384`).

Because the server keys its upsert on `(project_id, cleargate_id)` (`push-item.ts:364-376`), **every spike in a project collapses onto the same `unknown` row**, each push bumping the version of the previous spike's record. The second spike silently overwrites the first.

**Why this is newly reachable.** Before STORY-054-02, `getItemType` had no `spike_id` entry, so a spike push died loudly at `push.ts:253-257` with `Error: cannot determine item type from frontmatter` and `exit(1)`. STORY-054-02 correctly added `spike_id` to `getItemType` (:512) per M1 Open Decision #2 / R21, but the adjacent `getItemId` (:480-486) and `resolveLocalItem` (:459) key lists were out of that story's declared surface and still lack it. The net effect is that a loud failure became a silent wrong write.

**`spike` is the only type in this state.** `getItemType`'s map now holds seven keys; `getItemId`'s holds six. The one-key delta is exactly `spike_id`. `initiative_id` and `hotfix_id` are missing from *both*, so they still hard-error at the type check and never reach `getItemId`.

**Second, lower-severity face — `--revert` cannot find a spike.** `resolveLocalItem` (`push.ts:430-470`) matches on `['story_id','epic_id','proposal_id','cr_id','bug_id']` at `:459`. `cleargate push --revert SPIKE-001` therefore exits 1 with `Error: cannot resolve "SPIKE-001" to a local work item`, even though the charter is on disk. This one fails loudly and is not a data-integrity risk.

## 2. Reproduction Protocol

All steps are read-only against the repo; the measured run used an isolated tmpdir and a mock MCP client, so no network and no membership are required.

- Read the two key lists and diff them by eye: `sed -n '480,486p' cleargate-cli/src/commands/push.ts` (six keys, no `spike_id`) against `sed -n '506,518p' cleargate-cli/src/commands/push.ts` (seven keys, `spike_id` present at :512).
- Read the third list: `sed -n '456,463p' cleargate-cli/src/commands/push.ts` — `resolveLocalItem`'s five-key match, no `spike_id`.
- Confirm the caller is the main push path, not a side path: `grep -n "getItemId(" cleargate-cli/src/commands/push.ts` → `:266` (push) and `:386` (revert).
- Execute the push path against a tmpdir charter whose frontmatter carries `spike_id: SPIKE-001`, `approved: true`, with a mock `McpClient` recording its calls (the harness shape already exists at `cleargate-cli/test/lib/work-item-type-spike.node.test.ts:370-418`). Inspect `push_item`'s recorded `args.cleargate_id`.
- Observe `cleargate_id === "unknown"` and `type === "spike"`, exit code `null` (no exit called), stdout `push: unknown → version 1`.
- Confirm the existing test does not catch it: `sed -n '444,472p' cleargate-cli/test/lib/work-item-type-spike.node.test.ts` — the R21 scenario asserts `pushCall.args.type` only; `cleargate_id` is never read.

## 3. Evidence & Context

```
$ sed -n '480,486p' cleargate-cli/src/commands/push.ts
function getItemId(fm: Record<string, unknown>): string {
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'sprint_id', 'cr_id', 'bug_id']) {
    const val = fm[key];
    if (typeof val === 'string' && val) return val;
  }
  return 'unknown';
}

$ sed -n '506,518p' cleargate-cli/src/commands/push.ts
function getItemType(fm: Record<string, unknown>): string | null {
  const typeMap: Record<string, string> = {
    story_id: 'story',
    epic_id: 'epic',
    proposal_id: 'proposal',
    sprint_id: 'sprint',
    cr_id: 'cr',
    bug_id: 'bug',
    spike_id: 'spike',      <-- added by STORY-054-02
  };

$ sed -n '459p' cleargate-cli/src/commands/push.ts
        for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {

# Measured: pushHandler() against a tmpdir SPIKE-001_Test.md, mock McpClient
PUSH_ITEM_CALLED: true
cleargate_id: "unknown"
type: "spike"
stdout: ["push: unknown → version 1 (pushed_by: p@e.com)\n"]
stderr: []
exitCode: null
sync-log: {"ts":"2026-08-27T00:00:00.000Z","actor":"p@e.com","op":"push","target":"unknown","result":"ok"}

$ sed -n '356,362p' mcp/src/tools/push-item.ts
  // unknown_id_format (R4): fires when cleargate_id doesn't match TYPE-NNN or 5-digit formats
  if (!isKnownIdFormat(args.cleargate_id)) {
    warnings.push({
      code: 'unknown_id_format',
      message: `cleargate_id '${args.cleargate_id}' does not match TYPE-NNN or 5-digit conventions (advisory)`,
    });
  }
```

**Protocol/code divergence, noted for the fixer, not part of this bug.** `.cleargate/knowledge/cleargate-protocol.md:744` documents `ID_INVALID` as an **L1 error** ("cleargate_id does not match either valid format"), but the server implements it as an L2-shaped advisory warning (`unknown_id_format`). Under the documented behaviour this bug would fail loudly at the server; under the implemented behaviour it writes. Per the Codebase-is-source-of-truth rule, the implemented behaviour is what this bug is measured against. Whether the protocol text or the implementation moves is a separate call.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/push.ts` (:480-486) — `getItemId`'s six-key list. The primary fix.
- `cleargate-cli/src/commands/push.ts` (:456-463) — `resolveLocalItem`'s five-key list. The `--revert` face.
- `cleargate-cli/test/lib/work-item-type-spike.node.test.ts` (:444-472) — extend the existing R21 scenario to assert `pushCall.args.cleargate_id === 'SPIKE-001'`. The scenario already builds the exact fixture; it asserts one field short.

**Explicitly NOT in scope:**
- `cleargate-cli/src/commands/push.ts` (:506-518) `getItemType` — correct as of STORY-054-02; do not re-touch.
- The other eleven id-key registries enumerated in [[BUG-051]] R30 (`sync/work-items.ts`, `pull.ts`, `sync.ts`, `stamp-tokens.ts`, `wiki-comments-render.ts`, `contradict.ts`, `stamp-and-gate.sh`). This bug is the one **live, silent, data-corrupting** member of that set and is filed separately so it can ship without waiting for the unification.
- `mcp/` — the server's advisory treatment of a malformed id is a separate decision.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/lib/work-item-type-spike.node.test.ts`

The failing assertion goes into the existing `R21` describe block, one line below the current `type` assertion:

```ts
assert.equal(
  (pushCall!.args as { cleargate_id?: string }).cleargate_id,
  'SPIKE-001',
  'BUG-055: getItemId (push.ts:480) has no spike_id key, so the charter pushes under "unknown".',
);
```

Red before the fix (`'unknown' !== 'SPIKE-001'`), green after. A second case should cover `resolveLocalItem` by driving `pushHandler` with `{ revert: 'SPIKE-001' }` and asserting `sync_status` is called rather than `exit(1)`.

Do **not** verify by an actual `cleargate push` — this repo is `pre-member` and, more importantly, a real push would write the `unknown` row this bug is about.

---

## Prior work

- [[BUG-051]] — the parent divergence class: three frontmatter-key-to-type maps that disagree. Its §1(a) table covers `getItemType` only; `getItemId` and `resolveLocalItem` are a fourth and fifth list it does not enumerate, and its §4 Modify list cites `push.ts (:506-519)`, which is `getItemType`'s range alone.
- [[STORY-054-02]] — registered `spike_id` in `getItemType`, which is what makes this defect reachable. Correct as scoped; the adjacent lists were outside its declared §3.1 surface.
- [[BUG-041]] — unified the id *grammar* (`TYPE_PREFIXES`, which already carries `SPIKE`). This bug is one layer up: the grammar is right, the frontmatter-key registry is not.
- [[EPIC-054]] — the epic that makes spike charters something people will actually push.

## Context Source

**context_source:** verified codebase grounding — `push.ts` read directly at `3a114e9c`/cli `32eaaa0`; the `cleargate_id: "unknown"` result measured by executing `pushHandler` against a tmpdir charter with a recording mock `McpClient` during the STORY-054-02 Architect post-flight.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
