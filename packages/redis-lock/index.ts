import { Redis as RedisInterface } from "ioredis";
import { log } from "@openpay/logger";

export const LOCKING_RETRY_DELAY = 100;

interface RedisWithLocks extends RedisInterface {
  acquireLock(key: string, lock: number): Promise<string>;
  refreshLock(key: string, lock: number): Promise<string>;
  releaseLock(key: string, lock: number): Promise<string>;
}

function defineCommands(redis: RedisInterface): void {
  redis.defineCommand("acquireLock", {
    numberOfKeys: 1,
    lua: `
    if redis.call("EXISTS", KEYS[1]) == 0 then
      redis.call("SET", KEYS[1], ARGV[1], "EX", 5)
      return cjson.encode({["error"]= nil})
    end
    local expiry = redis.call("PTTL", KEYS[1])
    return cjson.encode({["error"]= "LOCKED", ["expiry"]= expiry})
  `,
  });

  redis.defineCommand("refreshLock", {
    numberOfKeys: 1,
    lua: `
    if redis.call("EXISTS", KEYS[1]) == 0 then
      return cjson.encode({["error"]= "NO_LOCK"})
    end
    local lock = redis.call("GET", KEYS[1])
    if lock ~= ARGV[1] then
      return cjson.encode({["error"]= "INCORRECT_LOCK"})
    end
    redis.call("EXPIRE", KEYS[1], 5)
    return cjson.encode({["error"]= nil})
  `,
  });

  redis.defineCommand("releaseLock", {
    numberOfKeys: 1,
    lua: `
    if redis.call("EXISTS", KEYS[1]) == 0 then
      return cjson.encode({["error"]= nil})
    end
    local lock = redis.call("GET", KEYS[1])
    if lock ~= ARGV[1] then
      return cjson.encode({["error"]= "INCORRECT_LOCK"})
    end
    redis.call("DEL", KEYS[1])
    return cjson.encode({["error"]= nil})
  `,
  });
}

export function initRedisLock(redis: RedisInterface): {
  acquireLock: (key: string, timeout?: number) => Promise<() => Promise<void>>;
} {
  defineCommands(redis);
  return {
    acquireLock: async (key: string, timeout?: number) =>
      acquireLockWithRetries(redis as RedisWithLocks, key, timeout),
  };
}

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function acquireLockInternal(redis: RedisWithLocks, key: string) {
  const lock = Math.random() * 1_000_000_000;
  const raw = await redis.acquireLock(key, lock);
  const { error } = JSON.parse(raw);

  if (error === "LOCKED") {
    return { locked: true };
  } else if (error) {
    log("Unexpected error while locking key", { error });
    throw Error("Could not lock key");
  }

  log("Acquired lock", { key, lock });

  const interval = setInterval(() => {
    log("Refreshing lock", { key, lock });
    redis
      .refreshLock(key, lock)
      .then((result) => {
        const rawRefresh = result as string;
        return JSON.parse(rawRefresh);
      })
      .then(({ error: refreshError }) => {
        if (refreshError) {
          clearInterval(interval);
          if (refreshError === "NO_LOCK") {
            log("Lock unexpectedly vanished during refreshing", { key, lock });
          } else if (refreshError === "INCORRECT_LOCK") {
            log("Lock unexpectedly changed during refreshing", { key, lock });
          } else {
            log("Unexpected error while refreshing lock", { key, lock });
          }
        }
        return true;
      })
      .catch((err) => {
        clearInterval(interval);
        if (err.message === "Connection is closed.") {
          log("Connection closed during lock refresh", { key, lock, err });
          return;
        }
        log("Unexpected error while refreshing lock", { key, lock, err });
      });
  }, 3000);

  let released = false;
  return {
    locked: false,
    async releaseLock() {
      if (released) {
        return;
      }
      released = true;
      log("Releasing lock", { key, lock });
      clearInterval(interval);
      return redis
        .releaseLock(key, lock)
        .then((result) => {
          const rawRelease = result as string;
          return JSON.parse(rawRelease);
        })
        .then(({ error: releaseError }) => {
          if (releaseError) {
            if (releaseError === "INCORRECT_LOCK") {
              log("Lock unexpectedly changed before release", { key, lock });
            } else {
              log("Unexpected error while releasing lock", { key, lock });
            }
          } else {
            log("Released lock", { key, lock });
          }
        })
        .catch((err) => {
          if (err.message === "Connection is closed.") {
            log("Connection closed during lock release", { key, lock, err });
            return;
          }
          log("Unexpected error while releasing lock", { key, lock, err });
        });
    },
  };
}

async function acquireLockWithRetries(
  redis: RedisWithLocks,
  key: string,
  timeout = 5000
): Promise<() => Promise<void>> {
  let outOfTime = false;
  let timer: NodeJS.Timeout | null = null;

  if (timeout) {
    timer = setTimeout(() => {
      outOfTime = true;
    }, timeout);
  }

  let locked = true;
  let releaseLock: (() => Promise<void>) | undefined;
  while (locked && !outOfTime) {
    ({ locked, releaseLock } = await acquireLockInternal(redis, key));
    if (locked) {
      await delay(LOCKING_RETRY_DELAY);
    }
  }

  if (outOfTime && locked) {
    throw Error("acquireLock took too long");
  }

  if (timer) {
    clearTimeout(timer);
  }

  return releaseLock || Promise.resolve;
}
