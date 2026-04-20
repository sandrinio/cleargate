/**
 * MCP client stub — STORY-006-01
 *
 * TODO(STORY-006-02): Implement exchange(), get(), signOut(), and scheduleRefresh().
 * STORY-006-02 will:
 *   - Add module-level adminToken / expiresAt / refreshTimer state
 *   - Implement exchange() with 401/403 handling
 *   - Implement get<T>() with 401-retry-once pattern
 *   - Import AuthExchangeResponseSchema from @cleargate/cli/admin-api/responses
 *   - Implement proactive token refresh (2 min before expiry)
 *
 * No localStorage/sessionStorage — tokens live in module-level memory only.
 */

export interface McpClientInterface {
  /** Exchange cg_session cookie for a short-lived admin_token */
  exchange(): Promise<{ admin_token: string; expires_at: string }>;
  /** Authenticated GET with 401-retry-once */
  get<T>(path: string, schema: { parse(data: unknown): T }): Promise<T>;
  /** Clear in-memory token (call on logout) */
  signOut(): void;
}

/** Stub — all methods throw "not implemented yet" until STORY-006-02 replaces this file. */
export const mcpClient: McpClientInterface = {
  exchange(): Promise<{ admin_token: string; expires_at: string }> {
    throw new Error('mcpClient.exchange() not implemented yet — wire in STORY-006-02');
  },

  get<T>(_path: string, _schema: { parse(data: unknown): T }): Promise<T> {
    throw new Error('mcpClient.get() not implemented yet — wire in STORY-006-02');
  },

  signOut(): void {
    // No-op stub — STORY-006-02 clears adminToken / refreshTimer
  },
};
