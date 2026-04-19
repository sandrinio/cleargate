import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { stubHandler } from './commands/_stub.js';
import { joinHandler } from './commands/join.js';
import { wikiBuildHandler } from './commands/wiki-build.js';
import { wikiIngestHandler } from './commands/wiki-ingest.js';
import { wikiLintHandler } from './commands/wiki-lint.js';
import { wikiQueryHandler } from './commands/wiki-query.js';

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
  .command('whoami')
  .description('print the currently authenticated agent identity')
  .action(stubHandler('whoami'));

program
  .command('stamp')
  .description('stamp a delivery artifact into the MCP server')
  .action(stubHandler('stamp'));

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

program
  .command('admin')
  .description('administrative operations (create-project, invite, issue-token, revoke-token)')
  .action(stubHandler('admin'));

void program.parseAsync(process.argv);
