# DEPRECATED — this tree is a frozen, read-only snapshot

**Do not edit anything under `cleargate-planning/`.**

As of **STORY-058-01** (2026-09-25), this directory is no longer the canonical
scaffold source. The `npm run prebuild` build in `cleargate-cli/` reads only
its own tracked checkout, never this meta-repo. The two new canonical roots
are:

- `cleargate-cli/scaffold/core/**` — harness-neutral `.cleargate/**` assets
  plus the payload's root `.gitignore`.
- `cleargate-cli/scaffold/hosts/claude/**` — Claude-only assets:
  `.claude/{agents,skills,hooks,settings.json}` plus the `CLAUDE.md`
  bounded-block source.

Both roots were extracted, byte- and mode-preserving, from this directory at
the `sprint/S-41` freeze SHA:

```
e911c38e2ce4bb2290c1713e251d8db1b00864c9
```

This snapshot is kept only so BUG-085's D4 re-declarations and a handful of
outer shell tests that still read `cleargate-planning/` have something to
point at, until they are repointed at the two roots above. It is not deleted
at SPRINT-41 close. Deletion is a follow-up CR, filed once nothing reads it
any more (see [[STORY-058-01]] §1.4 Open Questions).

Nobody edits this tree after STORY-058-01 merges — it is a snapshot, not a
second editable copy of the scaffold.
