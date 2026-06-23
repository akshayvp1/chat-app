import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on("connect", () => {
  console.log("✅ Redis Connected Successfully!");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redisClient;