---
cr_id: CR-079
parent_ref: EPIC-045
parent_cleargate_id: EPIC-045
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
area: framework/worktree
context_source: |
  Dogfood observation log dogfood-SPRINT-66-observations.md findings F4 + F7
  (`.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md:317-318` and
  `:326-327`), captured live during the new_app (Chyro) SPRINT-66 v2-parallel run.
  F4 (#worktree #test-harness): backend pytest in a ClearGate-managed story worktree
  cannot load settings because Chyro's `config.py` resolves `_ENV_FILE` via `parents[3]`
  and a fresh `git worktree add` checkout has no gitignored `.env`; the orchestrator's
  workaround is a manual `worktree-root/.env -> repo-root/.env` symlink before pytest.
  F7 (#cleargate): that very symlink then trips the `stray_env_files` pre-gate surface
  scan (gitignored, harmless, but flagged) — F7 explicitly folds its fix into F4
  ("if F4 provisions .env officially, the scan should exempt it"). Grounded against the
  worktree-add step (SKILL §C.2) and the stray_env scan in pre_gate_runner.sh
  (verified 2026-06-03). Routes to EPIC-045 per the tech-debt-findings memory directive.
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:32:11Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:15.907Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
---

# CR-079: Provision declared gitignored config into story worktrees + exempt it from the stray-env surface scan

## 0.5 Open Questions

- **Question:** Symlink or copy? When provisioning a configured gitignored config root (e.g. `.env`) into a fresh `.worktrees/STORY-NNN-NN/`, should worktree setup create a symlink back to the repo-root copy, or a real file copy?
- **Recommended:** Symlink by default (`worktree-root/.env -> repo-root/.env`), exactly mirroring the F4 hand-fix. A symlink stays live with the source-of-truth `.env`, costs nothing to refresh per worktree, and is trivially torn down with the worktree. Offer `copy` as an opt-in mode for the rare case where a worktree must hold a divergent config (and where a dangling symlink after `git worktree remove` would be undesirable). Document that a symlink target must be absolute so the doubled-cwd hazard (cf. F5) does not bite.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** Where does the list of config roots to provision come from — a new `config.yml` key, or a fixed convention?
- **Recommended:** A new `config.yml` key, defaulting to `[".env"]` and overridable per repo (e.g. `worktree.provision_config: [".env", ".env.local"]`). A convention-only hardcode would re-create the F3/F6 portability defect (ClearGate baking its own layout into shipped behavior). A config key keeps the framework general-purpose: polyglot targets declare their own gitignored config roots, and ClearGate provisions exactly those. The same key feeds the surface-scan exemption (§1) so the two stay in lockstep with one source of truth.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- "A story worktree created by `git worktree add .worktrees/STORY-NNN-NN ...` (SKILL §C.2) is a ready-to-run checkout." It is NOT — `git worktree add` brings only tracked files, so any gitignored config the target's build/tests read (e.g. a `.env` that Chyro's `config.py` resolves via `parents[3]`) is absent. The implicit assumption that the orchestrator/Developer can just run the target's test command inside a fresh worktree is wrong for any repo whose tooling depends on gitignored config.
- "The manual `worktree-root/.env -> repo-root/.env` symlink workaround is a clean fix." It works, but it then trips the `stray_env_files` pre-gate scan (F7) — a gitignored, harmless symlink reported as a surface violation. The scan currently has no notion of "this `.env` was provisioned on purpose," so the workaround that unblocks tests simultaneously false-flags the gate.

**New Logic (The New Truth):**
- ClearGate worktree setup OPTIONALLY provisions a configured set of gitignored config roots (default `[".env"]`, overridable via a `config.yml` key) into each newly-created story worktree — symlink by default, copy as opt-in — so the target's build/tests load their config in-worktree without a manual symlink.
- The `stray_env_files` pre-gate surface scan EXEMPTS config roots that ClearGate provisioned (the same configured list), so the official provisioning no longer reads as a stray-env violation. Provisioned config is expected, not stray.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Update SKILL §C.2 worktree-create step (`.claude/skills/sprint-execution/SKILL.md:244-256`) to document the config-provisioning step and its config key. Canonical edit requires the live `/.claude/` re-sync per the Dogfood-split rule.
- [ ] Update the `stray_env_files` scan (`.cleargate/scripts/pre_gate_runner.sh:249-271`) to read the provisioned-config exemption list and skip provisioned roots before recording FAIL.
- [ ] **Relationship to CR-072 (`.cleargate/delivery/pending-sync/CR-072_Cleargate_Init_Default_Gitignore_Expansion.md`):** COMPLEMENTARY, not duplicate. CR-072 makes `cleargate init` ADD `.env` to the target's `.gitignore` (so `.env` is ignored). This CR PROVISIONS that ignored `.env` into per-story worktrees and exempts the provisioned copy from the stray-env scan. CR-072 = "ignore `.env`"; CR-079 = "but still make the ignored `.env` available inside each worktree, without tripping the scan." They operate on opposite ends of the same `.env` lifecycle and must not be merged.
- [ ] No downstream Epic/Story currently depends on this leaf worktree-mechanics fix; the only cross-item coupling is the shared `.env` lifecycle with CR-072, flagged above. Nothing to revert to 🔴.
- [ ] Database schema impacts? No — no `mcp/`, `admin/`, or DB surface; this is worktree-setup + pre-gate-scan + config-key wiring only.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the ClearGate meta-repo working tree.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:244-256` — §C.2 "Create worktree" runs `git worktree add .worktrees/STORY-NNN-NN -b story/STORY-NNN-NN sprint/S-NN`. This is the step that creates a config-less checkout; it currently has no provisioning of gitignored config.
- **Surface:** `.cleargate/scripts/pre_gate_runner.sh:249-271` — the `stray_env_files` pre-gate scan: reads the `arch.stray_env_files` config list, then `record_result ... "stray_env_files" "FAIL"` on any match. This is the F7 false-flag site that must learn to exempt provisioned config.
- **Surface:** `.cleargate/scripts/gate-checks.json:12` — `"stray_env_files": [".env", ".env.local", ".env.production"]`, the config list that scan consumes; the provisioned-config exemption list pairs with this.
- **Surface:** `.cleargate/scripts/collision_surface.sh` — the broader pre-gate surface-scan companion script (collision-surface detection); referenced so the exemption logic is added to the correct scanner (`pre_gate_runner.sh`), not duplicated here.
- **Surface:** `.cleargate/scripts/surface-whitelist.txt` — the existing static surface-whitelist file; the provisioned-config exemption may reuse this whitelist mechanism rather than inventing a parallel allow-list.
- **Why this CR extends rather than rebuilds:** the worktree-create step and the stray-env scan both already exist and run live every sprint; this CR adds a provisioning step to the former and an exemption branch to the latter, reusing the existing `config.yml`/`gate-checks.json` config-read plumbing. It authors no new gate and no new worktree subsystem.

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify:**
- `.cleargate/scripts/pre_gate_runner.sh` (exempt provisioned config roots from the `stray_env_files` FAIL path, lines ~249-271)
- `.claude/skills/sprint-execution/SKILL.md` (document the §C.2 config-provisioning step + the config key)
- `.cleargate/config.yml` (add the `worktree.provision_config` key, default `[".env"]`)
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical mirror — keep byte-identical; re-sync live `/.claude/` after)
- `cleargate-planning/.cleargate/config.example.yml` (document the new key in the full reference config)

**Create:**
- `.cleargate/scripts/provision_worktree_config.sh` (new — symlink/copy the configured gitignored config roots into a given worktree path; absolute-path-safe per F5; invoked by the §C.2 worktree-create step)

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test:**
- `git worktree add .worktrees/TEST-079 -b test/079 HEAD && bash .cleargate/scripts/provision_worktree_config.sh .worktrees/TEST-079` then assert `.worktrees/TEST-079/.env` exists and (in symlink mode) `readlink .worktrees/TEST-079/.env` resolves to the absolute repo-root `.env`.
- With that provisioned `.env` present, run the `stray_env_files` scan against the worktree (`bash .cleargate/scripts/pre_gate_runner.sh` over the worktree path) and assert it records `stray_env_files PASS` (provisioned `.env` exempted), NOT FAIL.
- Negative control: drop a *non-provisioned* stray `.env.bak` into the worktree and confirm the scan still FAILs on it (the exemption is scoped to the configured list, not a blanket `.env*` mute).
- Teardown: `git worktree remove .worktrees/TEST-079` leaves no dangling symlink at the repo root.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log and verified codebase grounding.

**context_source:** dogfood-SPRINT-66-observations.md findings F4 (`.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md:317-318`) + F7 (`:326-327`) — worktree config provisioning and the stray-env-scan false-flag, captured live during the new_app SPRINT-66 v2-parallel run. Verified codebase grounding 2026-06-03: SKILL §C.2 worktree-add (`.claude/skills/sprint-execution/SKILL.md:244-256`), stray_env scan (`.cleargate/scripts/pre_gate_runner.sh:249-271`), config list (`.cleargate/scripts/gate-checks.json:12`). Complementary to [[CR-072]] (init `.gitignore` `.env` expansion). Routes to EPIC-045 per the tech-debt-findings memory directive.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 evicts the "fresh worktree is ready-to-run" and "manual symlink is clean" assumptions.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Epic/Story depends on this leaf worktree-mechanics fix; the only cross-item coupling is the shared `.env` lifecycle with CR-072, flagged complementary in §2. Nothing to revert.*
- [x] Execution Sandbox contains exact file paths. — *§3 lists the scan, SKILL, config.yml, canonical mirrors, and the new provisioning script.*
- [x] Verification command is provided. — *§4 gives provision + scan-PASS + negative-control + teardown commands.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Dogfood-sourced filing; approval is a separate Gate-1 step pending the §0.5 symlink-vs-copy and config-key decisions.*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Five verified paths cited, incl. the §C.2 worktree-add step and the `pre_gate_runner.sh` stray-env scan.*
