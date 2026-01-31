import { redis } from "../../redis";
import { log } from "@openpay/logger";

const TOKEN_PREFIX = "auth:token:";
const REFRESH_TOKEN_PREFIX = "auth:refresh:";
const DEFAULT_TOKEN_TTL = 3600; // 1 hour in seconds
const DEFAULT_REFRESH_TOKEN_TTL = 604800; // 7 days in seconds

/**
 * Store authentication token in Redis
 */
export async function storeToken(
  token: string,
  userId: string,
  ttl: number = DEFAULT_TOKEN_TTL
): Promise<void> {
  const key = `${TOKEN_PREFIX}${token}`;
  await redis.setex(key, ttl, userId);
  log("Token stored in Redis", { userId, ttl });
}

/**
 * Store refresh token in Redis
 */
export async function storeRefreshToken(
  refreshToken: string,
  userId: string,
  ttl: number = DEFAULT_REFRESH_TOKEN_TTL
): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
  await redis.setex(key, ttl, userId);
  log("Refresh token stored in Redis", { userId, ttl });
}

/**
 * Get user ID from authentication token
 */
export async function getUserIdFromToken(
  token: string
): Promise<string | null> {
  const key = `${TOKEN_PREFIX}${token}`;
  const userId = await redis.get(key);
  return userId;
}

/**
 * Get user ID from refresh token
 */
export async function getUserIdFromRefreshToken(
  refreshToken: string
): Promise<string | null> {
  const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
  const userId = await redis.get(key);
  return userId;
}

/**
 * Remove authentication token from Redis
 */
export async function removeToken(token: string): Promise<void> {
  const key = `${TOKEN_PREFIX}${token}`;
  await redis.del(key);
  log("Token removed from Redis");
}

/**
 * Remove refresh token from Redis
 */
export async function removeRefreshToken(refreshToken: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
  await redis.del(key);
  log("Refresh token removed from Redis");
}

/**
 * Remove all tokens for a user
 */
export async function removeAllUserTokens(userId: string): Promise<void> {
  const tokenPattern = `${TOKEN_PREFIX}*`;
  const refreshPattern = `${REFRESH_TOKEN_PREFIX}*`;

  const tokenKeys: string[] = [];
  const refreshKeys: string[] = [];

  // Scan for all token keys
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      tokenPattern,
      "COUNT",
      100
    );
    cursor = nextCursor;
    tokenKeys.push(...keys);
  } while (cursor !== "0");

  // Scan for all refresh token keys
  cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      refreshPattern,
      "COUNT",
      100
    );
    cursor = nextCursor;
    refreshKeys.push(...keys);
  } while (cursor !== "0");

  // Check each key and delete if it matches the user ID
  for (const key of [...tokenKeys, ...refreshKeys]) {
    const storedUserId = await redis.get(key);
    if (storedUserId === userId) {
      await redis.del(key);
    }
  }

  log("All user tokens removed from Redis", { userId });
}

/**
 * Extend token TTL
 */
export async function extendTokenTTL(
  token: string,
  ttl: number = DEFAULT_TOKEN_TTL
): Promise<void> {
  const key = `${TOKEN_PREFIX}${token}`;
  const exists = await redis.exists(key);
  if (exists) {
    await redis.expire(key, ttl);
    log("Token TTL extended", { ttl });
  }
}
