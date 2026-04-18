import * as os from 'node:os';
import * as path from 'node:path';
import { KeychainTokenStore } from './keychain-store.js';
import { FileTokenStore } from './file-store.js';
import type { TokenStore, TokenStoreFactoryOptions } from './token-store.js';

const DEFAULT_KEYCHAIN_SERVICE = 'cleargate';

function resolveFilePath(opts: TokenStoreFactoryOptions): string {
  if (opts.filePath) return opts.filePath;
  const home = os.homedir();
  if (!home) {
    throw new Error(
      'Cannot determine home directory. Set opts.filePath explicitly or ensure os.homedir() returns a non-empty string.',
    );
  }
  return path.join(home, '.cleargate', 'auth.json');
}

function defaultWarn(msg: string): void {
  process.stderr.write(msg + '\n');
}

/**
 * Creates a TokenStore, selecting the keychain backend when available and
 * falling back to file storage with a stderr warning when the OS keychain
 * cannot be accessed.
 */
export async function createTokenStore(
  opts: TokenStoreFactoryOptions = {},
): Promise<TokenStore> {
  const filePath = resolveFilePath(opts);
  const service = opts.keychainService ?? DEFAULT_KEYCHAIN_SERVICE;
  const warn = opts.warn ?? defaultWarn;

  // Short-circuit if backend is forced (test seam, skips probe)
  if (opts.forceBackend === 'file') {
    return new FileTokenStore(filePath);
  }
  if (opts.forceBackend === 'keychain') {
    return new KeychainTokenStore(service);
  }

  // Probe the keychain to determine availability
  try {
    const { Entry } = await import('@napi-rs/keyring');
    new Entry(service, '__cleargate_probe__').getPassword();
    // Probe succeeded (returned string | null cleanly) — use keychain
    return new KeychainTokenStore(service);
  } catch {
    // Constructor threw (native module load failed, libsecret missing on Linux)
    // OR getPassword() threw (dbus not running, prompt cancelled)
    // Either way, keychain is unavailable for this CLI invocation
    warn(
      `cleargate: OS keychain unavailable, falling back to file storage at ${filePath}. Run with --log-level=debug for details.`,
    );
    return new FileTokenStore(filePath);
  }
}
