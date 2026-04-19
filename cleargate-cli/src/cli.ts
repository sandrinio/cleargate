import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { stubHandler } from './commands/_stub.js';
import { joinHandler } from './commands/join.js';
import { wikiBuildHandler } from './commands/wiki-build.js';

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
  .description('ingest a single raw delivery file into the wiki (STORY-002-07)')
  .action(async (_file: string) => {
    throw new Error('wiki ingest: not yet implemented (STORY-002-07)');
  });

wiki
  .command('lint')
  .description('check wiki pages for drift vs raw sources (STORY-002-08)')
  .option('--suggest', 'advisory mode — exit 0, emit suggestions only')
  .action(async () => {
    throw new Error('wiki lint: not yet implemented (STORY-002-08)');
  });

wiki
  .command('query <terms...>')
  .description('search the wiki index (STORY-002-08)')
  .option('--persist', 'write result as a topic page under wiki/topics/')
  .action(async () => {
    throw new Error('wiki query: not yet implemented (STORY-002-08)');
  });

program
  .command('admin')
  .description('administrative operations (create-project, invite, issue-token, revoke-token)')
  .action(stubHandler('admin'));

void program.parseAsync(process.argv);
