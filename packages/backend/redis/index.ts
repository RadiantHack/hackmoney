import Redis from "ioredis";

const url = process.env.REDIS_URL as string;

if (!url) {
  throw new Error("REDIS_URL environment variable is required");
}

export const redis = new Redis(url, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});

export default redis;
