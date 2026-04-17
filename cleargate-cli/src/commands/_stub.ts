/**
 * Shared stub handler for all not-yet-implemented subcommands.
 * Writes "<name>: not yet implemented" to stderr and exits 1.
 */
export function stubHandler(name: string): () => never {
  return (): never => {
    process.stderr.write(`${name}: not yet implemented\n`);
    process.exit(1);
  };
}
