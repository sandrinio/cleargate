# CR-051 DevOps Report — DevOps Subagent Registration Investigation

**Story:** CR-051
**Merge SHA:** see git log on sprint/S-24
**Story branch:** story/CR-051 (deleted; was 891104f after duplicate-test cleanup, original Dev SHA 4ea1294)
**State transition:** Done
**Branch decision:** SC (session-cache; no frontmatter fix)
**Operator:** orchestrator-fallback (devops subagent_type still not registered — IRONIC: this is the very CR investigating that issue, dispatched via the escape-hatch it documents)

## Required reports

| Report | Status |
|---|---|
| CR-051-dev (acceptance signal) | ✓ |
| CR-051-qa.md | ✓ (PASS, 6/6, RED_RENAME_FLAG: yes — resolved pre-merge) |
| CR-051-arch.md | ✓ (APPROVED with 3 follow-ups: dup-test cleanup [done], Gate-4 live re-sync [queued], Red-naming canonical pattern [resolved as keep-`.red.`]) |
| CR-051 findings report | ✓ at `.cleargate/sprint-runs/SPRINT-24/devops-registration-findings.md` |

## Actions

1. **Pre-merge cleanup:** Architect post-flight noted Dev's "rename" actually created a duplicate — both `devops-agent-registration.red.node.test.ts` (qa-red commit 2b622e3) and `devops-agent-registration.node.test.ts` (Dev commit 4ea1294) existed byte-identical, glob-matched twice → 12 scenarios ran 2×. Per CR-049/052 precedent (keep `.red.` infix permanently), removed the duplicate verified copy via `git rm` on story/CR-051 (commit 891104f).
2. `git merge story/CR-051 --no-ff` — auto-merge clean.
3. `cd cleargate-cli && npm run prebuild` — 65 manifest, 71 payload files. Canonical SKILL.md → npm payload propagated.
4. **Mirror parity audit (with expected drift flag):**
   - `agents/devops.md`: byte-identical canonical = live ✓ (Branch SC = no edit)
   - `skills/sprint-execution/SKILL.md`: **DRIFT (expected)** — canonical edited (3 sections); live not auto-updated. **Queued for Gate-4 doc-refresh** via `cleargate init` re-sync.
5. Test verification: `tsx --test test/scaffold/devops-agent-registration.red.node.test.ts` — 12/12 pass (no duplication).
6. Worktree removed; story branch deleted; state → Done.

## Branch SC findings (summary; full report at `devops-registration-findings.md`)

- Frontmatter delta: **none.** devops.md byte-comparable to qa.md, developer.md, architect.md frontmatter shape.
- Root cause: **Claude Code agent registry caches at session start.** devops.md added in SPRINT-22 CR-044 mid-session (during sprint execution); never picked up by registry. Subsequent sessions also miss because... actually this is interesting. SPRINT-23 was a fresh session and STILL "not found". SPRINT-24 (this session) ALSO "not found" on multiple dispatches. The hypothesis is incomplete — fresh-session test would settle it definitively.
- Fix: docs-only. SKILL.md §1 has registration constraint note; §A.1 preflight check 6 verifies devops subagent_type reachable; §C.7 escape-hatch documents orchestrator-fallback inline path.

## TPV signal — third operational dispatch

CR-051 TPV: APPROVED. Running tally: 0/3 BLOCKED-WIRING-GAP returns. CR-050 with 8 caller migrations is the real stress test.

## Open follow-ups (queued for Gate-4 / SPRINT-25)

1. **Live SKILL.md re-sync at Gate-4** — orchestrator runs `cleargate init` post-merge; with FIRST_INSTALL_ONLY hotfix `f6dfe39`, only `.cleargate/scripts/*` are exempt; `.claude/skills/*` re-syncs cleanly.
2. **Branch SC root-cause confirmation deferred** — true fresh-session reproduction (close + reopen Claude Code session) would settle session-cache hypothesis. Surface as SPRINT-25 micro-task if the issue persists post-Gate-4 re-sync.

## Flashcards flagged

- `2026-05-04 · #devops #agent-registry #session-cache · CR-051 confirmed: subagent_type=devops "not found" across multiple sessions despite valid devops.md; frontmatter delta ruled out via byte-compare; session-cache hypothesis pending fresh-session confirmation.`
- `2026-05-04 · #cr-043 #red-naming #canonical · Red tests stay permanently named *.red.node.test.ts (CR-049 + CR-052 + CR-051 post-cleanup precedent); do not "rename" Red→Verified by adding a duplicate file.`
