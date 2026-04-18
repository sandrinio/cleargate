import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { TokenStore } from './token-store.js';

const ProfileEntrySchema = z.object({ refreshToken: z.string().min(1) }).strict();

export const AuthFileSchema = z
  .object({
    version: z.literal(1),
    profiles: z.record(z.string().min(1), ProfileEntrySchema),
  })
  .strict();

type AuthFile = z.infer<typeof AuthFileSchema>;

const EMPTY_AUTH_FILE: AuthFile = { version: 1, profiles: {} };

export class FileTokenStore implements TokenStore {
  readonly backend = 'file' as const;

  constructor(private readonly filePath: string) {}

  async save(profile: string, token: string): Promise<void> {
    const current = await this.readFile();
    const updated: AuthFile = {
      ...current,
      profiles: {
        ...current.profiles,
        [profile]: { refreshToken: token },
      },
    };
    await this.writeFile(updated);
  }

  async load(profile: string): Promise<string | null> {
    const data = await this.readFile();
    return data.profiles[profile]?.refreshToken ?? null;
  }

  async remove(profile: string): Promise<void> {
    let current: AuthFile;
    try {
      current = await this.readFile();
    } catch {
      // File doesn't exist or unreadable — no-op since there's nothing to remove
      return;
    }
    if (!(profile in current.profiles)) {
      return; // Profile doesn't exist — idempotent
    }
    const { [profile]: _removed, ...rest } = current.profiles;
    const updated: AuthFile = { ...current, profiles: rest };
    await this.writeFile(updated);
  }

  private async readFile(): Promise<AuthFile> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return EMPTY_AUTH_FILE;
      }
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        `Failed to parse auth file at ${this.filePath}: invalid JSON`,
      );
    }

    const result = AuthFileSchema.safeParse(parsed);
    if (!result.success) {
      // Check for version mismatch specifically
      const versionCheck = (parsed as Record<string, unknown>)?.['version'];
      if (versionCheck !== 1) {
        throw new Error(
          `Invalid auth file at ${this.filePath}: unsupported version ${String(versionCheck)}. Please upgrade \`@cleargate/cli\` to read this file.`,
        );
      }
      throw new Error(
        `Invalid auth file at ${this.filePath}: ${result.error.message}`,
      );
    }

    return result.data;
  }

  private async writeFile(data: AuthFile): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    // Explicit chmod after mkdir — mkdir only sets mode on newly created dirs
    await fs.chmod(dir, 0o700).catch(() => {
      // If chmod fails on existing dir, that's acceptable — we don't want to
      // surprise users who have set custom modes on ~/.cleargate/
    });

    const json = JSON.stringify(data, null, 2);
    const tmpPath = path.join(dir, '.auth.json.tmp');

    // Atomic write: write to tmp then rename to avoid partial-write corruption
    await fs.writeFile(tmpPath, json, { mode: 0o600 });
    // Explicit chmod after writeFile — writeFile only sets mode on file creation
    await fs.chmod(tmpPath, 0o600);
    await fs.rename(tmpPath, this.filePath);
    // After rename, chmod the final path to ensure it stays 0600
    await fs.chmod(this.filePath, 0o600);
  }
}
