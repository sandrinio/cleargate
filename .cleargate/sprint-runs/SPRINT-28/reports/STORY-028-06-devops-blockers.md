# DevOps Blockers — STORY-028-06

## Failure-Step

Step 3 failed: `git merge story/STORY-028-06 --no-ff` produced a content conflict in `cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts` due to a 3-way rename-merge collision between STORY-028-06 (vitest→node:test conversion) and the already-merged STORY-067-03 (CR-067 vocabulary changes in the same file).

## Conflict-Files

- `cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts`

## Diagnostics

### Root Cause

Git detected a rename from `lifecycle-reconcile.test.ts` → `lifecycle-reconcile.node.test.ts` (STORY-028-06) and attempted to merge STORY-067-03's semantic edits (already on sprint/S-28 as `lifecycle-reconcile.test.ts`) into the converted file. The conflicts occur at two locations:

**Conflict 1 — line 273:**
- sprint/S-28 (STORY-067-03): `assert.strictEqual(result.drift[0]?.expected_status, 'Completed');`
- story/STORY-028-06: `assert.strictEqual(result.drift[0]?.expected_status, 'Done');`

**Conflict 2 — lines 518–548:**
- sprint/S-28 (STORY-067-03): VERB_STATUS_MAP tests asserting `'Completed'` only (`.not.toContain('Done')`, `.not.toContain('Verified')`)
- story/STORY-028-06: VERB_STATUS_MAP tests still using `'Verified'` / `'Done'` (pre-CR-067 values)

### Merge Output

```
Auto-merging cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts
CONFLICT (content): Merge conflict in cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts
Automatic merge failed; fix conflicts and then commit the result.
```

### What Happened

STORY-067-03 was merged to sprint/S-28 first and updated `lifecycle-reconcile.test.ts` (the vitest version) with CR-067 vocabulary changes (`Done`→`Completed`, `Verified`→`Completed`). STORY-028-06's conversion to `lifecycle-reconcile.node.test.ts` was based on the original pre-CR-067 file, so the converted file still has the old assertion values. The fix is trivial (2 string replacements in the `.node.test.ts` file on the story branch), but requires Developer action — DevOps does not author code.

### Resolution Required

On `story/STORY-028-06`, update `cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts`:

1. Line ~273: change `'Done'` → `'Completed'` in the `expected_status` assertion (Scenario 2 drift test)
2. Lines ~518–548: update VERB_STATUS_MAP tests to match the CR-067 tightened assertions:
   - Remove `expect(VERB_STATUS_MAP['feat']!.expected).toContain('Done');`
   - Add `expect(VERB_STATUS_MAP['feat']!.expected).not.toContain('Done');`
   - Add `expect(VERB_STATUS_MAP['feat']!.expected).not.toContain('Verified');`
   - Change `expect(VERB_STATUS_MAP['fix']!.expected).toContain('Verified');` → `.toContain('Completed')` + `.not.toContain('Verified')`
3. Also verify line ~175: `writeArtifact(archiveDir, 'BUG-001', 'Verified');` may need → `'Completed'` (same Scenario 3 fixture change STORY-067-03 applied to the vitest version)

### Pre-merge Side Effect

The untracked `STORY-028-06-dev.md` in the main worktree was removed to allow the merge attempt (it was about to be overwritten by the tracked version in the story branch — same content). The dev report remains intact inside the worktree at `.worktrees/STORY-028-06/`.

### Current State

- Merge aborted; sprint/S-28 is clean (HEAD = a81fdd92 or prior merge commit)
- Stash contains: `.cleargate/sprint-runs/SPRINT-28/.session-totals.json`, `state.json`, `token-ledger.jsonl` (stash entry: `devops-pre-merge: ledger/state artifacts`)
- Worktree `.worktrees/STORY-028-06` still exists
- Branch `story/STORY-028-06` still exists

### Recommended Action

Developer should:
1. `git checkout story/STORY-028-06` (or work in `.worktrees/STORY-028-06`)
2. Apply the 2–3 assertion fixes above to `cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts`
3. Run `npm test -- cleargate-cli/test/lib/lifecycle-reconcile.node.test.ts` to verify
4. Commit the fix and re-dispatch DevOps
5. Also run `git stash pop` on the main worktree to restore ledger artifacts after DevOps re-dispatch
