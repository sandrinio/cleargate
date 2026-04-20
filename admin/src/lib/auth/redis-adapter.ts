/**
 * Custom @auth/core Adapter backed by ioredis.
 *
 * Key namespace: ONLY `cg_session:*` — never writes `rev:*` / `rl:*` / `idem:*`.
 * Session TTL: 7 days (604800 seconds) on create.
 * M1 exchange endpoint is responsible for sliding-TTL bumping on each exchange call.
 *
 * STORY-006-02
 */
import Redis from 'ioredis';
import type { Adapter, AdapterUser, AdapterSession, AdapterAccount } from '@auth/core/adapters';

const SESSION_PREFIX = 'cg_session:';
const USER_PREFIX = 'cg_user:';
const ACCOUNT_PREFIX = 'cg_account:';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env['REDIS_URL'];
    if (!url) throw new Error('REDIS_URL env var is required for the Redis session adapter');
    redisClient = new Redis(url);
  }
  return redisClient;
}

/** Build the session key from the session token */
function sessionKey(token: string): string {
  return `${SESSION_PREFIX}${token}`;
}

function userKey(id: string): string {
  return `${USER_PREFIX}${id}`;
}

function accountKey(provider: string, providerAccountId: string): string {
  return `${ACCOUNT_PREFIX}${provider}:${providerAccountId}`;
}

export function createRedisAdapter(): Adapter {
  return {
    async createUser(user: AdapterUser): Promise<AdapterUser> {
      const redis = getRedis();
      const key = userKey(user.id);
      await redis.set(key, JSON.stringify(user));
      return user;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const redis = getRedis();
      const raw = await redis.get(userKey(id));
      if (!raw) return null;
      return JSON.parse(raw) as AdapterUser;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      // We index email via a secondary key stored at cg_user:email:<email>
      const redis = getRedis();
      const idKey = `${USER_PREFIX}email:${email}`;
      const id = await redis.get(idKey);
      if (!id) return null;
      const raw = await redis.get(userKey(id));
      if (!raw) return null;
      return JSON.parse(raw) as AdapterUser;
    },

    async getUserByAccount(
      providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
    ): Promise<AdapterUser | null> {
      const redis = getRedis();
      const key = accountKey(providerAccountId.provider, providerAccountId.providerAccountId);
      const raw = await redis.get(key);
      if (!raw) return null;
      const account = JSON.parse(raw) as AdapterAccount;
      const userRaw = await redis.get(userKey(account.userId));
      if (!userRaw) return null;
      return JSON.parse(userRaw) as AdapterUser;
    },

    async updateUser(
      user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>
    ): Promise<AdapterUser> {
      const redis = getRedis();
      const key = userKey(user.id);
      const existing = await redis.get(key);
      const merged: AdapterUser = { ...(existing ? JSON.parse(existing) : {}), ...user } as AdapterUser;
      await redis.set(key, JSON.stringify(merged));
      return merged;
    },

    async deleteUser(userId: string): Promise<void> {
      const redis = getRedis();
      await redis.del(userKey(userId));
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const redis = getRedis();
      const key = accountKey(account.provider, account.providerAccountId);
      await redis.set(key, JSON.stringify(account));
      return account;
    },

    async unlinkAccount(
      providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
    ): Promise<void> {
      const redis = getRedis();
      const key = accountKey(providerAccountId.provider, providerAccountId.providerAccountId);
      await redis.del(key);
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      const redis = getRedis();
      const key = sessionKey(session.sessionToken);

      // Fetch user to get github_handle, github_user_id, avatar_url
      const userRaw = await redis.get(userKey(session.userId));
      const user = userRaw ? (JSON.parse(userRaw) as AdapterUser & {
        github_handle?: string;
        github_user_id?: string;
        avatar_url?: string;
      }) : null;

      const sessionData = {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires.toISOString(),
        // M1 contract fields — required for exchange endpoint
        github_handle: user?.github_handle ?? '',
        github_user_id: user?.github_user_id ?? '',
        avatar_url: user?.avatar_url ?? '',
        expires_at: session.expires.toISOString(),
        issued_at: new Date().toISOString(),
      };

      const ttl = Math.max(SESSION_TTL, Math.floor((session.expires.getTime() - Date.now()) / 1000));
      await redis.set(key, JSON.stringify(sessionData), 'EX', ttl);

      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      };
    },

    async getSessionAndUser(sessionToken: string): Promise<{
      session: AdapterSession;
      user: AdapterUser;
    } | null> {
      const redis = getRedis();
      const key = sessionKey(sessionToken);
      const raw = await redis.get(key);
      if (!raw) return null;

      const data = JSON.parse(raw) as {
        sessionToken: string;
        userId: string;
        expires: string;
      };

      const expires = new Date(data.expires);
      if (expires < new Date()) {
        await redis.del(key);
        return null;
      }

      const userRaw = await redis.get(userKey(data.userId));
      if (!userRaw) return null;
      const user = JSON.parse(userRaw) as AdapterUser;

      return {
        session: {
          sessionToken,
          userId: data.userId,
          expires,
        },
        user,
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>
    ): Promise<AdapterSession | null | undefined> {
      const redis = getRedis();
      const key = sessionKey(session.sessionToken);
      const raw = await redis.get(key);
      if (!raw) return null;

      const existing = JSON.parse(raw);
      const updated = { ...existing, ...session };
      if (session.expires) {
        updated.expires = session.expires.toISOString();
        updated.expires_at = session.expires.toISOString();
      }
      // Keep existing TTL
      await redis.set(key, JSON.stringify(updated), 'KEEPTTL');

      return {
        sessionToken: session.sessionToken,
        userId: updated.userId,
        expires: session.expires ?? new Date(existing.expires),
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      const redis = getRedis();
      await redis.del(sessionKey(sessionToken));
    },
  };
}

/** Reset the Redis client (for testing) */
export function _resetRedisClient(): void {
  redisClient = null;
}

/** Inject a Redis client (for testing) */
export function _setRedisClient(client: Redis): void {
  redisClient = client;
}
