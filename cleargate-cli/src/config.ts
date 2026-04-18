import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { z } from 'zod';

export const ConfigSchema = z
  .object({
    mcpUrl: z.string().url().optional(),
    profile: z.string().min(1).default('default'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .strict();

export type Config = z.infer<typeof ConfigSchema>;

/** Partial raw config used for each layer before merge */
type RawConfig = Partial<{
  mcpUrl: string | undefined;
  profile: string | undefined;
  logLevel: string | undefined;
}>;

export interface LoadConfigOptions {
  flags?: RawConfig;
  env?: NodeJS.ProcessEnv;
  configPath?: string;
}

/**
 * Synchronously loads and merges config from all layers:
 * flags > env > config file > zod defaults
 */
export function loadConfig(opts: LoadConfigOptions = {}): Config {
  const {
    flags = {},
    env = process.env,
    configPath,
  } = opts;

  // Resolve config file path
  const resolvedConfigPath =
    configPath ??
    (() => {
      const home = os.homedir();
      if (!home) return null;
      return path.join(home, '.cleargate', 'config.json');
    })();

  // Layer: file
  let fileLayer: RawConfig = {};
  if (resolvedConfigPath) {
    try {
      const raw = fs.readFileSync(resolvedConfigPath, 'utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(
          `Failed to parse config file at ${resolvedConfigPath}: invalid JSON`,
        );
      }
      // Validate file contents strictly (unknown keys will throw here)
      const fileResult = ConfigSchema.safeParse(parsed);
      if (!fileResult.success) {
        throw new Error(
          `Invalid config file at ${resolvedConfigPath}: ${fileResult.error.message}`,
        );
      }
      fileLayer = fileResult.data;
    } catch (err) {
      // Re-throw parse/validation errors; silently skip only ENOENT
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        // file doesn't exist — skip silently
      } else {
        throw err;
      }
    }
  }

  // Layer: env
  const envLayer: RawConfig = {};
  if (env['CLEARGATE_MCP_URL']) {
    envLayer.mcpUrl = env['CLEARGATE_MCP_URL'];
  }
  if (env['CLEARGATE_PROFILE']) {
    envLayer.profile = env['CLEARGATE_PROFILE'];
  }
  if (env['CLEARGATE_LOG_LEVEL']) {
    envLayer.logLevel = env['CLEARGATE_LOG_LEVEL'];
  }

  // Merge: flags > env > file (start from {} so zod defaults fill in missing fields)
  const merged: Record<string, unknown> = {
    ...fileLayer,
    ...envLayer,
    ...(flags.mcpUrl !== undefined ? { mcpUrl: flags.mcpUrl } : {}),
    ...(flags.profile !== undefined ? { profile: flags.profile } : {}),
    ...(flags.logLevel !== undefined ? { logLevel: flags.logLevel } : {}),
  };

  // Remove undefined values so zod defaults apply properly
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  }

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(`Config validation failed: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Asserts mcpUrl is present, throws a user-friendly error if not.
 */
export function requireMcpUrl(cfg: Config): string {
  if (cfg.mcpUrl === undefined) {
    throw new Error(
      'mcpUrl not configured. Run `cleargate join <invite-url>` first.',
    );
  }
  return cfg.mcpUrl;
}
