import { createClient, type RedisClientOptions } from "redis";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const redisUrl = process.env.REDIS_URL?.trim();
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 5;

function reconnectStrategy(retries: number, cause: Error): number | Error {
  if (retries >= MAX_RECONNECT_ATTEMPTS) {
    console.error("[redis] Reconnect limit reached:", cause.message);
    return new Error("Redis reconnect limit reached");
  }

  const delay = Math.min(500 * 2 ** retries, 5_000);
  console.warn(
    `[redis] Reconnect ${retries + 1}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
  );
  return delay;
}

const baseSocket = {
  connectTimeout: CONNECT_TIMEOUT_MS,
  reconnectStrategy,
};

function buildRedisOptions(): RedisClientOptions {
  if (redisUrl) {
    let parsed: URL;
    try {
      parsed = new URL(redisUrl);
    } catch {
      throw new Error("REDIS_URL is invalid");
    }

    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      throw new Error("REDIS_URL must use redis:// or rediss://");
    }

    if (parsed.protocol === "rediss:") {
      return {
        url: redisUrl,
        socket: {
          ...baseSocket,
          tls: true,
          servername: parsed.hostname,
        },
      };
    }

    return { url: redisUrl, socket: baseSocket };
  }

  if (isProduction) {
    throw new Error("REDIS_URL is required in production");
  }

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  return { url: `redis://${host}:${port}`, socket: baseSocket };
}

const redisClient = createClient(buildRedisOptions());

redisClient.on("connect", () => {
  console.log("[redis] Connected");
});

redisClient.on("ready", () => {
  console.log("[redis] Ready");
});

redisClient.on("reconnecting", () => {
  console.warn("[redis] Reconnecting");
});

redisClient.on("error", (error: Error) => {
  console.error("[redis] Error:", error.message);
});

redisClient.on("end", () => {
  console.warn("[redis] Connection closed");
});

let connectionPromise: Promise<void> | null = null;

export async function connectRedis(): Promise<void> {
  if (redisClient.isReady) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    if (redisClient.isOpen) {
      throw new Error("Redis client is open but not ready");
    }

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Redis connection timed out")),
        CONNECT_TIMEOUT_MS
      );
    });

    try {
      await Promise.race([redisClient.connect(), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  try {
    await connectionPromise;
    console.log("[redis] Connection established");
  } finally {
    connectionPromise = null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

export default redisClient;
