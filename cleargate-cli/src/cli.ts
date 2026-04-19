import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { stubHandler } from './commands/_stub.js';
import { joinHandler } from './commands/join.js';
import { stampHandler } from './commands/stamp.js';
import { initHandler } from './commands/init.js';
import { wikiBuildHandler } from './commands/wiki-build.js';
import { wikiIngestHandler } from './commands/wiki-ingest.js';
import { wikiLintHandler } from './commands/wiki-lint.js';
import { wikiQueryHandler } from './commands/wiki-query.js';
import { doctorHandler } from './commands/doctor.js';
import { gateCheckHandler, gateExplainHandler } from './commands/gate.js';

const program = new Command();

program
  .name('cleargate')
  .description('ClearGate CLI — connects AI agent teams to the ClearGate MCP server')
  .version(pkg.version, '-V, --version')
  .option('--profile <name>', 'configuration profile to use', 'default')
  .option('--mcp-url <url>', 'MCP server URL (overrides config file and env)')
  .showHelpAfterError('(use `cleargate --help`)');

program
  .command('join <invite-url>')
  .description('join a ClearGate workspace using an invite URL')
  .action(async (inviteUrl: string, _opts: Record<string, unknown>, command: Command) => {
    const globals = command.parent!.opts<{ profile: string; mcpUrl?: string }>();
    await joinHandler({
      inviteUrl,
      profile: globals.profile,
      mcpUrlFlag: globals.mcpUrl,
    });
  });

program
  .command('init')
  .description('initialise a repo with ClearGate scaffold (CLAUDE.md block, hook config, agents, templates)')
  .option('--force', 'overwrite existing files that differ from the bundled payload')
  .action(async (opts: { force?: boolean }) => {
    await initHandler({ force: opts.force ?? false });
  });

program
  .command('whoami')
  .description('print the currently authenticated agent identity')
  .action(stubHandler('whoami'));

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

program
  .command('admin')
  .description('administrative operations (create-project, invite, issue-token, revoke-token)')
  .action(stubHandler('admin'));

program
  .command('doctor')
  .description('diagnose scaffold drift and hook health')
  .option('--check-scaffold', 'check scaffold files for drift against install snapshot')
  .option('--session-start-mode', 'hidden: enables daily throttle (used by session-start hook)', false)
  .option('-v, --verbose', 'show per-file drift detail')
  .addHelpText('after', [
    '',
    'Modes (mutually exclusive):',
    '  --check-scaffold    Compute drift for all tracked scaffold files.',
    '                      Writes .cleargate/.drift-state.json.',
    '  (default)           Print a minimal hook-config health report.',
    '',
    'STORY-008-06 (M3) adds --session-start and --pricing modes.',
  ].join('\n'))
  .action(async (opts: { checkScaffold?: boolean; sessionStartMode?: boolean; verbose?: boolean }) => {
    await doctorHandler({
      checkScaffold: opts.checkScaffold,
      sessionStartMode: opts.sessionStartMode,
      verbose: opts.verbose,
    });
  });

void program.parseAsync(process.argv);
