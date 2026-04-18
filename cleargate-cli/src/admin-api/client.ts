/**
 * AdminApiClient — typed HTTP client for the ClearGate admin API.
 *
 * Key implementation notes:
 * - CLI method args are camelCase; wire bodies are snake_case (converted internally)
 * - DELETE requests MUST omit Content-Type (Fastify 5 FST_ERR_CTP_EMPTY_JSON_BODY)
 * - All 2xx responses are validated through vendored Zod schemas
 * - Errors map to AdminApiError with kind → exit code table in D6
 */
import { AdminApiError } from './errors.js';
import {
  ProjectSchema,
  InviteCreatedSchema,
  TokenIssuedSchema,
  type Project,
  type InviteCreated,
  type TokenIssued,
} from './responses.js';
import { redactSensitive } from './redact.js';

export interface AdminApiClientOptions {
  baseUrl: string;
  token: string;
  fetch?: typeof globalThis.fetch;
  warn?: (msg: string) => void;
  userAgent?: string;
}

export interface AdminApiClient {
  createProject(input: { name: string }): Promise<Project>;
  inviteMember(input: {
    projectId: string;
    email: string;
    role: 'user' | 'service';
    displayName?: string;
  }): Promise<InviteCreated>;
  issueToken(input: {
    projectId: string;
    memberId: string;
    name: string;
    expiresAt?: string;
  }): Promise<TokenIssued>;
  revokeToken(input: { tokenId: string }): Promise<void>;
}

function defaultWarn(msg: string): void {
  process.stderr.write(msg + '\n');
}

class AdminApiClientImpl implements AdminApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly warn: (msg: string) => void;
  private readonly userAgent: string;

  constructor(opts: AdminApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.token = opts.token;
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.warn = opts.warn ?? defaultWarn;
    this.userAgent = opts.userAgent ?? `cleargate`;
  }

  private debugLog(method: string, path: string, status: number, body: unknown): void {
    if (process.env['CLEARGATE_LOG_LEVEL'] === 'debug') {
      const redacted = redactSensitive(body);
      this.warn(`[admin-api] ${method} ${path} → ${status} ${JSON.stringify(redacted)}`);
    }
  }

  private async request<T>(
    method: string,
    urlPath: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}/admin-api/v1${urlPath}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'User-Agent': this.userAgent,
      Accept: 'application/json',
    };

    // CRITICAL: omit Content-Type on requests without body (DELETE)
    // Fastify 5 throws FST_ERR_CTP_EMPTY_JSON_BODY if Content-Type is set with empty body
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new AdminApiError(
        'network',
        null,
        err,
        `cannot reach ${this.baseUrl} (${err instanceof Error ? err.message : String(err)})`,
      );
    }

    // Parse response body when present
    let responseBody: unknown = null;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }
    }

    this.debugLog(method, urlPath, response.status, responseBody);

    // Map HTTP status to AdminApiError kinds
    if (!response.ok) {
      const errBody = responseBody as { error?: string; details?: unknown } | null;
      if (response.status === 401) {
        throw new AdminApiError('auth', 401, responseBody, 'Admin token rejected.');
      }
      if (response.status === 403) {
        throw new AdminApiError('forbidden', 403, responseBody, 'Token is not admin-role.');
      }
      if (response.status === 404) {
        throw new AdminApiError('not_found', 404, responseBody, 'Not found.');
      }
      if (response.status === 400 || response.status === 409) {
        throw new AdminApiError(
          'invalid_request',
          response.status,
          errBody?.details ?? responseBody,
          `Invalid request: ${errBody?.error ?? 'unknown'}`,
        );
      }
      if (response.status >= 500) {
        throw new AdminApiError(
          'server',
          response.status,
          responseBody,
          `Server error ${response.status}.`,
        );
      }
      throw new AdminApiError(
        'server',
        response.status,
        responseBody,
        `Unexpected status ${response.status}.`,
      );
    }

    return responseBody as T;
  }

  async createProject(input: { name: string }): Promise<Project> {
    const raw = await this.request<unknown>('POST', '/projects', { name: input.name });
    const parsed = ProjectSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AdminApiError(
        'response_shape',
        null,
        parsed.error,
        'Server returned unexpected response shape (CLI may be out of date).',
      );
    }
    return parsed.data;
  }

  async inviteMember(input: {
    projectId: string;
    email: string;
    role: 'user' | 'service';
    displayName?: string;
  }): Promise<InviteCreated> {
    const body: Record<string, unknown> = {
      email: input.email,
      role: input.role,
    };
    if (input.displayName !== undefined) {
      body['display_name'] = input.displayName;
    }
    const raw = await this.request<unknown>(
      'POST',
      `/projects/${input.projectId}/members`,
      body,
    );
    const parsed = InviteCreatedSchema.safeParse(raw);
    if (!parsed.success) {
      // Try MemberSchema in case the server returned a member-only response
      throw new AdminApiError(
        'response_shape',
        null,
        parsed.error,
        'Server returned unexpected response shape (CLI may be out of date).',
      );
    }
    return parsed.data;
  }

  async issueToken(input: {
    projectId: string;
    memberId: string;
    name: string;
    expiresAt?: string;
  }): Promise<TokenIssued> {
    const body: Record<string, unknown> = {
      member_id: input.memberId,
      name: input.name,
    };
    if (input.expiresAt !== undefined) {
      body['expires_at'] = input.expiresAt;
    }
    const raw = await this.request<unknown>(
      'POST',
      `/projects/${input.projectId}/tokens`,
      body,
    );
    const parsed = TokenIssuedSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AdminApiError(
        'response_shape',
        null,
        parsed.error,
        'Server returned unexpected response shape (CLI may be out of date).',
      );
    }
    return parsed.data;
  }

  async revokeToken(input: { tokenId: string }): Promise<void> {
    // No body — Content-Type must be omitted (Fastify 5 CTP quirk)
    await this.request<unknown>('DELETE', `/tokens/${input.tokenId}`, undefined);
  }
}

export function createAdminApiClient(opts: AdminApiClientOptions): AdminApiClient {
  return new AdminApiClientImpl(opts);
}
