/**
 * Typed error class for all admin API failures.
 * kind → exit code mapping lives in mcp/scripts/commands/_render-error.ts
 */
export class AdminApiError extends Error {
  constructor(
    public readonly kind:
      | 'network'
      | 'auth'
      | 'forbidden'
      | 'not_found'
      | 'invalid_request'
      | 'server'
      | 'response_shape',
    public readonly status: number | null,
    public readonly details: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}
