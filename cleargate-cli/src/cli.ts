import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { stubHandler } from './commands/_stub.js';
import { joinHandler } from './commands/join.js';

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

program
  .command('wiki')
  .description('query or update the workspace wiki')
  .action(stubHandler('wiki'));

program
  .command('admin')
  .description('administrative operations (create-project, invite, issue-token, revoke-token)')
  .action(stubHandler('admin'));

void program.parseAsync(process.argv);
