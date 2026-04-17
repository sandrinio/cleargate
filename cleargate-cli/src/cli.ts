const version = '0.1.0-alpha.0';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-V')) {
  process.stdout.write(version + '\n');
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`cleargate v${version}\n`);
  process.exit(0);
}

process.stderr.write(`cleargate v${version} — use --help for usage\n`);
process.exit(1);
