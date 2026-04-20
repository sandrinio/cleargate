/**
 * Typed error classes for mcp-client — STORY-006-02
 */

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export class ForbiddenError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

export class NetworkError extends Error {
  readonly status: number;
  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'NetworkError';
    this.status = status;
  }
}
