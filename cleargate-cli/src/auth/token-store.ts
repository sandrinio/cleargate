/**
 * TokenStore — interface + factory options types only.
 * Zero runtime imports (consumers can import types cheaply).
 */

export interface TokenStore {
  /** Persist a refresh token for the named profile. Overwrites any existing value. */
  save(profile: string, token: string): Promise<void>;
  /** Return the stored refresh token for the profile, or null if none. */
  load(profile: string): Promise<string | null>;
  /** Remove the stored token for the profile. Idempotent — no error if absent. */
  remove(profile: string): Promise<void>;
  /** Backend identifier for diagnostics. */
  readonly backend: 'keychain' | 'file';
}

export interface TokenStoreFactoryOptions {
  /** Override file path for FileTokenStore (test seam). Default: ~/.cleargate/auth.json */
  filePath?: string;
  /** Override keychain service name (test seam). Default: "cleargate". */
  keychainService?: string;
  /** Force a backend, bypassing detection. Used by tests. */
  forceBackend?: 'keychain' | 'file';
  /** stderr writer for the "keychain unavailable" warning. Default: process.stderr.write. */
  warn?: (msg: string) => void;
}
