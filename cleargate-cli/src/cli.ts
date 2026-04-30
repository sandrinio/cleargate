// SPRINT-14 M5 dogfood smoke — STORY-099-01
// CR-011: preAction membership gating + --all flag + help-text filtering
import { Command, type Command as CommandType } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { scaffoldLintHandler } from './commands/scaffold-lint.js';
import { joinHandler } from './commands/join.js';
import { stampHandler } from './commands/stamp.js';
import { initHandler } from './commands/init.js';
import { wikiBuildHandler } from './commands/wiki-build.js';
import { wikiIngestHandler } from './commands/wiki-ingest.js';
import { wikiLintHandler } from './commands/wiki-lint.js';
import { wikiQueryHandler } from './commands/wiki-query.js';
import { wikiAuditStatusHandler } from './commands/wiki-audit-status.js';
import { wikiContradictHandler } from './commands/wiki-contradict.js';
import { doctorHandler } from './commands/doctor.js';
import { gateCheckHandler, gateExplainHandler, gateQaHandler, gateArchHandler } from './commands/gate.js';
import { gateRunHandler } from './commands/gate-run.js';
import { sprintInitHandler, sprintCloseHandler, sprintArchiveHandler, reconcileLifecycleCliHandler } from './commands/sprint.js';
import { storyStartHandler, storyCompleteHandler } from './commands/story.js';
import { stateUpdateHandler, stateValidateHandler } from './commands/state.js';
import { stampTokensHandler } from './commands/stamp-tokens.js';
import { upgradeHandler } from './commands/upgrade.js';
import { uninstallHandler } from './commands/uninstall.js';
import { syncHandler, syncCheckHandler } from './commands/sync.js';
import { pullHandler } from './commands/pull.js';
import { pushHandler } from './commands/push.js';
import { conflictsHandler } from './commands/conflicts.js';
import { syncLogHandler } from './commands/sync-log.js';
import { adminLoginHandler } from './commands/admin-login.js';
import { hotfixNewHandler } from './commands/hotfix.js';
import { mcpServeHandler } from './commands/mcp-serve.js';
import { getMembershipState } from './lib/membership.js';

// CR-011: commands that are gated (require membership).
// All other commands are in the open subset.
const GATED_COMMANDS = new Set([
  'push',
  'pull',
  'sync',
  'sync check',
  'sync-log',
  'conflicts',
  'admin bootstrap-root',
  'admin create-project',
  'admin invite',
  'admin issue-token',
  'admin revoke-token',
]);

// CR-011: resolve the full subcommand name from a Commander command.
// Handles nested subcommands like `admin login`, `wiki build`, etc.
function resolveCommandName(cmd: CommandType): string {
  const name = cmd.name();
  const parent = cmd.parent;
  if (parent && parent.name() !== 'cleargate' && parent.name() !== '') {
    return `${parent.name()} ${name}`;
  }
  return name;
}

const program = new Command();

program
  .name('cleargate')
  .description('ClearGate CLI — connects AI agent teams to the ClearGate MCP server')
  .version(pkg.version, '-V, --version')
  .option('--profile <name>', 'configuration profile to use', 'default')
  .option('--mcp-url <url>', 'MCP server URL (overrides config file and env)')
  .option('--all', 'show all commands in help, including those requiring membership')
  .showHelpAfterError('(use `cleargate --help`)');

// CR-011: preAction membership gating hook.
// Fires before every command action. Reads program-level --profile (globals).
// FLASHCARD #cli #commander: read program.opts().profile NOT cmd.opts().profile —
// Commander v12 places global options on program, not on subcommands.
program.hook('preAction', (_thisCommand: CommandType, actionCommand: CommandType) => {
  const cmdName = resolveCommandName(actionCommand);

  // Only gate commands in the GATED_COMMANDS set.
  if (!GATED_COMMANDS.has(cmdName)) return;

  // Read profile from program-level globals (Commander v12: globals live on program).
  const programOpts = program.opts<{ profile: string }>();
  const profile = programOpts.profile ?? 'default';

  const membershipState = getMembershipState({ profile });
  if (membershipState.state === 'pre-member') {
    process.stderr.write(
      `cleargate ${cmdName}: requires membership. Run: cleargate join <invite-url>\n`
    );
    process.exit(2);
  }
});

// CR-011: help-text filtering.
// When state is pre-member (and --all is NOT set), hide gated commands from help.
program.configureHelp({
  visibleCommands: (cmd: CommandType): CommandType[] => {
    // cmd.commands returns readonly Command[]; spread to get a mutable copy.
    const allCommands: CommandType[] = [...cmd.commands];
    const programOpts = program.opts<{ all?: boolean; profile?: string }>();

    // If --all flag is present, show everything.
    if (programOpts.all) return allCommands;

    // Check membership state (cheap-path, no network).
    const profile = programOpts.profile ?? 'default';
    const membershipState = getMembershipState({ profile });

    // In member state, show all commands.
    if (membershipState.state === 'member') return allCommands;

    // In pre-member state, hide gated top-level commands.
    // Gated top-level command names (first word only for top-level filtering).
    const gatedTopLevel = new Set(['push', 'pull', 'sync', 'sync-log', 'conflicts', 'admin']);

    return allCommands.filter((c) => !gatedTopLevel.has(c.name()));
  },
});

program
  .command('join <invite-url>')
  .description('join a ClearGate workspace using an invite URL')
  .option('--auth <provider>', 'identity provider: github | email')
  .option('--non-interactive', 'fail instead of prompting (CI mode)')
  .option('--code <code>', 'OTP code for non-interactive email auth')
  .action(async (inviteUrl: string, _opts: Record<string, unknown>, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    const cmdOpts = command.opts<{ auth?: string; nonInteractive?: boolean; code?: string }>();
    await joinHandler({
      inviteUrl,
      profile: globals.profile,
      mcpUrlFlag: globals.mcpUrl,
      // FLASHCARD #cli #commander #optional-key: only set keys when defined
      ...(cmdOpts.auth !== undefined ? { auth: cmdOpts.auth } : {}),
      ...(cmdOpts.nonInteractive === true ? { nonInteractive: true } : {}),
      ...(cmdOpts.code !== undefined ? { code: cmdOpts.code } : {}),
    });
  });

program
  .command('init')
  .description('initialise a repo with ClearGate scaffold (CLAUDE.md block, hook config, agents, templates)')
  .option('--force', 'overwrite existing files that differ from the bundled payload')
  .option('--yes', 'non-interactive: accept all defaults without prompting')
  .option('--pin <ver>', 'CR-009: pin hook resolver to a specific cleargate CLI version (default: package version)')
  .action(async (opts: { force?: boolean; yes?: boolean; pin?: string }) => {
    await initHandler({ force: opts.force ?? false, yes: opts.yes ?? false, pin: opts.pin });
  });

program
  .command('whoami')
  .description('print the currently authenticated agent identity')
  .option('--json', 'CR-011: emit membership state as JSON (no network call)')
  .action(async (opts: { json?: boolean }) => {
    const { whoamiHandler } = await import('./commands/whoami.js');
    const parentOpts = program.opts<{ profile: string; mcpUrl?: string }>();
    await whoamiHandler({
      profile: parentOpts.profile,
      mcpUrlFlag: parentOpts.mcpUrl,
      json: opts.json,
    });
  });

program
  .command('stamp <file>')
  .description('stamp ClearGate metadata fields into a file\'s frontmatter')
  .option('--dry-run', 'print planned changes without writing')
  .action(async (file: string, opts: { dryRun?: boolean }) => {
    await stampHandler(file, { dryRun: opts.dryRun });
  });

const wiki = program
  .command('wiki')
  .description('query or update the workspace wiki');

wiki
  .command('build')
  .description('full rebuild of .cleargate/wiki/ from raw delivery items')
  .action(async () => {
    await wikiBuildHandler();
  });

wiki
  .command('ingest <file>')
  .description('ingest a single raw delivery file into the wiki')
  .action(async (file: string) => {
    await wikiIngestHandler({ rawPath: file });
  });

wiki
  .command('lint')
  .description('check wiki pages for drift vs raw sources')
  .option('--suggest', 'advisory mode — exit 0, emit suggestions only')
  .helpOption('--help', [
    'Usage: cleargate wiki lint [--suggest]',
    '',
    'Enforcement mode (default): exits 1 on any finding.',
    'Suggest mode (--suggest): exits 0, prefixes findings with [advisory],',
    '  and emits Karpathy cross-ref discovery candidates.',
  ].join('\n'))
  .action(async (_opts: Record<string, unknown>, command: Command) => {
    const cmdOpts = command.opts<{ suggest?: boolean }>();
    await wikiLintHandler({
      mode: cmdOpts.suggest ? 'suggest' : 'enforce',
    });
  });

wiki
  .command('query <terms...>')
  .description('search the wiki index for matching work items')
  .option('--persist', 'write result as a topic page under wiki/topics/')
  .addHelpText('after', [
    '',
    'NOTE: CLI synthesis is grep-and-list. For NL synthesis with the',
    'cleargate-wiki-query subagent, invoke from a Claude Code session.',
    'This diverges from PROPOSAL-002 §2.2 intentionally for testability',
    'and offline/scripted use.',
  ].join('\n'))
  .action(async (terms: string[], opts: { persist?: boolean }) => {
    await wikiQueryHandler({
      query: terms.join(' '),
      persist: opts.persist ?? false,
    });
  });

wiki
  .command('audit-status')
  .description('detect raw-item status/location drift; --fix applies safe corrections')
  .option('--fix', 'apply safe status corrections to frontmatter')
  .option('--yes', 'required together with --fix to confirm writes')
  .option('--quiet', 'suppress diff output')
  .action(async (opts: { fix?: boolean; yes?: boolean; quiet?: boolean }) => {
    await wikiAuditStatusHandler(opts);
  });

wiki
  .command('contradict <file>')
  .description('run the wiki contradiction check against a single page (advisory)')
  .option('--dry-run', 'print findings without mutating wiki/contradictions.md or stamping last_contradict_sha')
  .addHelpText('after', [
    '',
    'Two-step flow (Mode A — in-agent-session):',
    '  1. cleargate wiki contradict <file>',
    '     Runs deterministic prep (status filter, SHA idempotency, neighborhood',
    '     collection, prompt) and emits a `phase4:` JSON line to stdout.',
    '     The calling agent reads this, spawns cleargate-wiki-contradict via Task,',
    '     and receives findings.',
    '  2. The agent calls commitPhase4Findings (or a follow-up commit subcommand)',
    '     to write findings to wiki/contradictions.md and stamp last_contradict_sha.',
    '',
    'With --dry-run: print findings (or skipped notice) without any state mutation.',
  ].join('\n'))
  .action(async (file: string, opts: { dryRun?: boolean }) => {
    await wikiContradictHandler({
      filePath: file,
      ...(opts.dryRun === true ? { dryRun: true } : {}),
    });
  });

const gate = program
  .command('gate')
  .description('evaluate readiness gates for a ClearGate work-item file');

gate
  .command('check <file>')
  .description('evaluate readiness criteria and write result to frontmatter')
  .option('-v, --verbose', 'show full expected-vs-actual detail per criterion')
  .option('--transition <name>', 'override auto-detected transition name')
  .action(async (file: string, opts: { verbose?: boolean; transition?: string }) => {
    await gateCheckHandler(file, { verbose: opts.verbose, transition: opts.transition });
  });

gate
  .command('explain <file>')
  .description('render cached gate result in ≤50 agent tokens (read-only)')
  .action(async (file: string) => {
    await gateExplainHandler(file);
  });

gate
  .command('qa <worktree> <branch>')
  .description('run QA pre-gate scanner on a story worktree (v2 only — inert under v1)')
  .option('--sprint <id>', 'sprint ID for execution_mode lookup')
  .action((worktree: string, branch: string, opts: { sprint?: string }) => {
    gateQaHandler({ worktree, branch }, { sprintId: opts.sprint });
  });

gate
  .command('arch <worktree> <branch>')
  .description('run Architect pre-gate scanner on a story worktree (v2 only — inert under v1)')
  .option('--sprint <id>', 'sprint ID for execution_mode lookup')
  .action((worktree: string, branch: string, opts: { sprint?: string }) => {
    gateArchHandler({ worktree, branch }, { sprintId: opts.sprint });
  });

// STORY-018-03: config-driven gates. Commander v12 does NOT treat `<name>` as a
// catch-all fallback when sibling literal subcommands exist (QA'd on 2026-04-25
// — it emits "unknown command" before a parameterized handler can fire). Since
// the gate names are a closed set, enumerate them explicitly.
for (const gateName of ['precommit', 'test', 'typecheck', 'lint'] as const) {
  gate
    .command(gateName)
    .description(`run the configured ${gateName} gate command`)
    .option('--strict', 'exit non-zero if gate not configured')
    .action((opts: { strict?: boolean }) => {
      gateRunHandler(gateName, { strict: opts.strict === true ? true : undefined });
    });
}

program
  .command('scaffold-lint')
  .description('grep cleargate-planning/ for stack-specific strings; fail on leaks')
  .option('--fix-hint', 'emit placeholder suggestions per finding')
  .option('--versions', 'also flag semver-shaped strings')
  .option('--quiet', 'suppress per-finding output; exit code only')
  .action(async (opts: { fixHint?: boolean; versions?: boolean; quiet?: boolean }) => {
    await scaffoldLintHandler(opts);
  });

const sprint = program
  .command('sprint')
  .description('sprint lifecycle commands (v2 only — inert under v1)');

sprint
  .command('init <sprint-id>')
  .description('initialise a new sprint — creates state.json and worktree skeleton')
  .requiredOption('--stories <csv>', 'comma-separated story IDs for this sprint')
  .option('--allow-drift', 'CR-017: permit lifecycle drift at sprint kickoff (v1 warn-only); does NOT waive decomposition gate')
  .action((sprintId: string, opts: { stories: string; allowDrift?: boolean }) => {
    sprintInitHandler({ sprintId, stories: opts.stories, allowDrift: opts.allowDrift });
  });

sprint
  .command('close <sprint-id>')
  .description('close a sprint — validates all stories are terminal, runs prefill + suggest_improvements')
  .option('--assume-ack', 'skip the "waiting for Reporter" gate and flip state to Completed directly')
  .action((sprintId: string, opts: { assumeAck?: boolean }) => {
    const handlerOpts: { sprintId: string; assumeAck?: boolean } = { sprintId };
    // FLASHCARD #cli #commander #optional-key: omit key when undefined
    if (opts.assumeAck === true) {
      handlerOpts.assumeAck = true;
    }
    sprintCloseHandler(handlerOpts);
  });

// CR-017: `cleargate sprint reconcile-lifecycle <sprint-id>`
// Pure wrapper around reconcileLifecycle. Used by close_sprint.mjs (Step 2.6).
sprint
  .command('reconcile-lifecycle <sprint-id>')
  .description('CR-017: check lifecycle status of artifacts referenced in this sprint\'s commits (exits 1 on drift)')
  .option('--since <iso-date>', 'start of git log range (default: sprint start_date or 90 days ago)')
  .option('--until <iso-date>', 'end of git log range (default: now)')
  .action((sprintId: string, opts: { since?: string; until?: string }) => {
    reconcileLifecycleCliHandler({ sprintId, since: opts.since, until: opts.until });
  });

sprint
  .command('archive <sprint-id>')
  .description('archive a completed sprint — move pending-sync files, clear .active, merge + delete sprint branch')
  .option('--dry-run', 'print the archive plan without making any changes')
  .action(async (sprintId: string, opts: { dryRun?: boolean }) => {
    // FLASHCARD #cli #commander #optional-key: omit key when undefined
    const handlerOpts: { sprintId: string; dryRun?: boolean } = { sprintId };
    if (opts.dryRun === true) {
      handlerOpts.dryRun = true;
    }
    await sprintArchiveHandler(handlerOpts);
  });

const story = program
  .command('story')
  .description('story lifecycle commands (v2 only — inert under v1)');

story
  .command('start <story-id>')
  .description('create a git worktree for a story on the sprint branch')
  .option('--sprint <id>', 'sprint ID for execution_mode lookup')
  .action((storyId: string, opts: { sprint?: string }) => {
    storyStartHandler({ storyId }, { sprintId: opts.sprint });
  });

story
  .command('complete <story-id>')
  .description('mark a story complete and clean up its worktree (stub — requires complete_story.mjs)')
  .option('--sprint <id>', 'sprint ID for execution_mode lookup')
  .action((storyId: string, opts: { sprint?: string }) => {
    storyCompleteHandler({ storyId }, { sprintId: opts.sprint });
  });

const state = program
  .command('state')
  .description('state.json management commands (v2 only — inert under v1)');

state
  .command('update <story-id> <new-state>')
  .description('update a story\'s state in state.json')
  .option('--sprint <id>', 'sprint ID for execution_mode lookup (overrides .active sentinel)')
  .action((storyId: string, newState: string, opts: { sprint?: string }) => {
    // FLASHCARD #cli #commander #optional-key: omit key when undefined
    const cliOpts: Parameters<typeof stateUpdateHandler>[1] = {};
    if (opts.sprint !== undefined) {
      cliOpts.sprintId = opts.sprint;
    }
    stateUpdateHandler({ storyId, newState }, cliOpts);
  });

state
  .command('validate <sprint-id>')
  .description('validate all story states in a sprint\'s state.json')
  .option('--sprint <id>', 'override sprint ID for execution_mode lookup')
  .action((sprintId: string, opts: { sprint?: string }) => {
    const cliOpts: Parameters<typeof stateValidateHandler>[1] = {};
    if (opts.sprint !== undefined) {
      cliOpts.sprintId = opts.sprint;
    }
    stateValidateHandler({ sprintId: opts.sprint ?? sprintId }, cliOpts);
  });

program
  .command('stamp-tokens <file>')
  .description('stamp draft_tokens from token-ledger into a work-item file (hook-invoked)')
  .option('--dry-run', 'print planned changes without writing')
  .action(async (file: string, opts: { dryRun?: boolean }) => {
    await stampTokensHandler(file, { dryRun: opts.dryRun });
  });

const admin = program
  .command('admin')
  .description('administrative operations (login, create-project, invite, issue-token, revoke-token)');

admin
  .command('login')
  .description('log in as a ClearGate admin via GitHub OAuth device flow')
  .option('--mcp-url <url>', 'MCP server URL (overrides CLEARGATE_MCP_URL and config file)')
  .action(async (opts: { mcpUrl?: string }, command: Command) => {
    const globals = command.parent!.parent!.opts<{ mcpUrl?: string }>();
    await adminLoginHandler({
      mcpUrl: opts.mcpUrl ?? globals.mcpUrl,
    });
  });

admin
  .command('bootstrap-root <handle>')
  .description('seed the first root admin in admin_users (idempotent)')
  .option('--database-url <url>', 'Postgres connection string; falls back to DATABASE_URL env')
  .option('--force', 'override second-root guard / promote non-root user to root')
  .action(async (handle: string, opts: { databaseUrl?: string; force?: boolean }) => {
    const { bootstrapRootHandler } = await import('./commands/bootstrap-root.js');
    await bootstrapRootHandler({ handle, databaseUrl: opts.databaseUrl, force: opts.force ?? false });
  });

program
  .command('doctor')
  .description('diagnose scaffold drift, hook health, blocked items, and token cost')
  .option('--check-scaffold', 'check scaffold files for drift against install snapshot')
  .option('--session-start-mode', 'hidden: enables daily throttle (used by session-start hook)', false)
  .option('--session-start', 'emit blocked pending-sync items summary (used by SessionStart hook)')
  .option('--pricing <file>', 'compute USD cost estimate from a work item\'s draft_tokens')
  .option('--can-edit <file>', 'CR-008: exit 0 if editing file is allowed, exit 1 if planning required')
  .option('--cwd <dir>', 'working directory for the doctor check (default: process.cwd())')
  .option('-v, --verbose', 'show per-file drift detail')
  .addHelpText('after', [
    '',
    'Modes (mutually exclusive):',
    '  --check-scaffold    Compute drift for all tracked scaffold files.',
    '                      Writes .cleargate/.drift-state.json.',
    '  --session-start     List blocked pending-sync items (≤10, ≤100 tokens).',
    '  --pricing <file>    Compute USD estimate from a work item\'s draft_tokens.',
    '  --can-edit <file>   Check if editing a file requires a planning work item.',
    '  (default)           Print a minimal hook-config health report.',
    '',
    'Exit codes:',
    '  0  Clean — no blockers, no config errors.',
    '  1  Blocked items or advisory issues — see stdout.',
    '  2  ClearGate misconfigured or partially installed — see stdout for remediation.',
  ].join('\n'))
  .action(async (opts: { checkScaffold?: boolean; sessionStartMode?: boolean; sessionStart?: boolean; pricing?: string; canEdit?: string; cwd?: string; verbose?: boolean }) => {
    await doctorHandler({
      checkScaffold: opts.checkScaffold,
      sessionStartMode: opts.sessionStartMode,
      sessionStart: opts.sessionStart,
      pricing: !!opts.pricing,
      pricingFile: opts.pricing,
      canEdit: !!opts.canEdit,
      canEditFile: opts.canEdit,
      verbose: opts.verbose,
    }, opts.cwd ? { cwd: opts.cwd } : undefined);
  });

program
  .command('upgrade')
  .description('three-way merge scaffold files with upstream changes')
  .option('--dry-run', 'print plan without making any changes')
  .option('--yes', 'auto-accept "take theirs" for all merge-3way files (non-interactive)')
  .option('--only <tier>', 'restrict to a specific scaffold tier (protocol/template/agent/hook/skill/cli-config)')
  .addHelpText('after', [
    '',
    'Overwrite policies:',
    '  always      — silent overwrite with package content',
    '  never       — silent skip',
    '  preserve    — silent skip',
    '  merge-3way  — interactive: [k]eep mine / [t]ake theirs / [e]dit in $EDITOR',
    '',
    '--yes auto-accepts [t]ake theirs for all merge-3way files.',
  ].join('\n'))
  .action(async (opts: { dryRun?: boolean; yes?: boolean; only?: string }) => {
    await upgradeHandler({ dryRun: opts.dryRun, yes: opts.yes, only: opts.only });
  });

program
  .command('uninstall')
  .description('remove ClearGate scaffold from a project (preservation-first)')
  .option('--dry-run', 'preview planned actions without making any changes (CI-safe)')
  .option('--preserve <tiers>', 'comma-separated tier ids to force-preserve (default: user-artifact)')
  .option('--remove <tiers>', 'comma-separated tier ids to force-remove; use "all" to remove everything including user artifacts (DANGEROUS)')
  .option('--yes', 'skip typed project-name confirmation (dangerous — use in scripts/CI)')
  .option('--path <dir>', 'target directory (must contain .cleargate/.install-manifest.json); defaults to cwd')
  .option('--force', 'bypass uncommitted-changes safety check (not applicable for non-git targets)')
  .addHelpText('after', [
    '',
    'Preservation defaults:',
    '  user-artifact tier  → kept (FLASHCARD.md, archive, pending-sync, sprint REPORT.md)',
    '  framework tiers     → removed (protocol, template, agent, hook, skill, cli-config)',
    '',
    'Always removed (no prompt): .claude/agents/*.md, ClearGate hooks,',
    '  .claude/skills/flashcard/, CLAUDE.md CLEARGATE block,',
    '  `cleargate` from package.json, .install-manifest.json, .drift-state.json.',
    '',
    'Non-git targets: uncommitted-changes check is skipped silently.',
  ].join('\n'))
  .action(async (opts: {
    dryRun?: boolean;
    preserve?: string;
    remove?: string;
    yes?: boolean;
    path?: string;
    force?: boolean;
  }) => {
    await uninstallHandler({
      dryRun: opts.dryRun,
      preserve: opts.preserve ? opts.preserve.split(',').map((s) => s.trim()) : undefined,
      remove: opts.remove ? opts.remove.split(',').map((s) => s.trim()) : undefined,
      yes: opts.yes,
      path: opts.path,
      force: opts.force,
    });
  });

program
  .command('sync')
  .description('pull remote updates, resolve conflicts, push local changes')
  .option('--dry-run', 'print plan without making any changes or sync-log entries')
  .option('--check', 'read-only drift probe — prints JSON, no mutation, hook-safe')
  .action(async (opts: { dryRun?: boolean; check?: boolean }, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    if (opts.check) {
      await syncCheckHandler({ profile: globals.profile });
      return;
    }
    await syncHandler({ dryRun: opts.dryRun ?? false, profile: globals.profile });
  });

program
  .command('pull <id-or-remote-id>')
  .description('pull a single item from the remote PM tool by local ID or remote_id')
  .option('--comments', 'also pull comments for this item (STORY-010-06; not yet implemented)')
  .action(async (idOrRemoteId: string, opts: { comments?: boolean }, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    await pullHandler(idOrRemoteId, { comments: opts.comments, profile: globals.profile });
  });

program
  .command('push <file>')
  .description('push a local work item to the MCP server (requires approved: true in frontmatter)')
  .option('--revert <id-or-remote-id>', 'soft-revert a pushed item by setting status to archived-without-shipping')
  .option('--force', 'bypass the "done" status guard when reverting')
  .addHelpText('after', [
    '',
    'Push mode:',
    '  Reads local frontmatter. Requires approved: true — exits 1 without network call otherwise.',
    '  On success: writes pushed_by + pushed_at from server back to local frontmatter.',
    '  Appends sync-log entry op=push.',
    '',
    'Revert mode (--revert <id-or-remote-id>):',
    '  Calls cleargate_sync_status with status=archived-without-shipping.',
    '  Does NOT delete the remote item or remove local remote_id.',
    '  Refuses if local status=done unless --force is passed.',
    '  Appends sync-log entry op=push-revert.',
  ].join('\n'))
  .action(async (file: string, opts: { revert?: string; force?: boolean }, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    await pushHandler(file, { revert: opts.revert, force: opts.force, profile: globals.profile });
  });

program
  .command('conflicts')
  .description('list unresolved sync conflicts from .cleargate/.conflicts.json')
  .option('--refresh', 'force a new /auth/refresh even if the cached token is still valid')
  .action(async (opts: { refresh?: boolean }, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    await conflictsHandler({ refresh: opts.refresh, profile: globals.profile });
  });

program
  .command('sync-log')
  .description('filter and print sync-log entries')
  .option('--actor <email>', 'filter by actor email')
  .option('--op <op>', 'filter by operation (push|pull|pull-intake|...)')
  .option('--target <id>', 'filter by target work item ID')
  .option('--limit <n>', 'maximum number of entries to show (default 50)', '50')
  .action(async (opts: { actor?: string; op?: string; target?: string; limit?: string }) => {
    await syncLogHandler({
      actor: opts.actor,
      op: opts.op,
      target: opts.target,
      limit: opts.limit !== undefined ? parseInt(opts.limit, 10) : 50,
    });
  });

const hotfix = program
  .command('hotfix')
  .description('hotfix lane commands (off-sprint trivial fix scaffolding)');

// FLASHCARD #cli #commander #subcommand-routing (2026-04-25): Commander v12
// does NOT treat `<verb>` as a catch-all fallback when sibling literal
// subcommands exist. Since `new` is the only verb for now, enumerate it
// explicitly as a literal subcommand.
hotfix
  .command('new <slug>')
  .description('scaffold a new HOTFIX-NNN_<slug>.md in pending-sync/')
  .action((slug: string) => {
    hotfixNewHandler({ slug });
  });

// BUG-019: stdio↔HTTP MCP proxy with auto-refresh auth.
const mcp = program
  .command('mcp')
  .description('MCP-server bridge commands (stdio shim, registration helpers)');

mcp
  .command('serve')
  .description('run a stdio MCP server that proxies to the cleargate HTTP /mcp endpoint with auto-refresh Bearer auth')
  .action(async (_opts, command: Command) => {
    const globals = command.parent!.parent!.opts<{ profile: string; mcpUrl?: string }>();
    await mcpServeHandler({
      profile: globals.profile,
      ...(globals.mcpUrl !== undefined ? { mcpUrlFlag: globals.mcpUrl } : {}),
    });
  });

void program.parseAsync(process.argv);
