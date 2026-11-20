import { Server } from "socket.io";
import redisClient from "../config/redis";
import { User } from "../models/userModels";

const JOIN_SCRIPT = `
local added = redis.call("SADD", KEYS[1], ARGV[1])
if added == 0 then
  return {0, ""}
end
local token = redis.call("INCR", KEYS[3])
local total = redis.call("SCARD", KEYS[1])
if total == 1 then
  redis.call("SET", KEYS[2], "1")
  return {1, token}
end
return {0, token}
`;

const LEAVE_SCRIPT = `
local removed = redis.call("SREM", KEYS[1], ARGV[1])
if removed == 0 then
  return {0, ""}
end
local token = redis.call("INCR", KEYS[3])
local total = redis.call("SCARD", KEYS[1])
if total == 0 then
  redis.call("DEL", KEYS[1], KEYS[2])
  return {1, token}
end
return {0, token}
`;

type Transition = { changed: boolean; token: string };

const pendingByUser = new Map<string, Promise<unknown>>();

function presenceKeys(userId: string) {
  return {
    set: `presence:${userId}`,
    online: `online:${userId}`,
    token: `presence:${userId}:token`,
  };
}

function parseTransition(reply: unknown): Transition {
  if (!Array.isArray(reply)) return { changed: false, token: "" };
  return { changed: Number(reply[0]) === 1, token: String(reply[1] ?? "") };
}

function withUserLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = pendingByUser.get(userId) ?? Promise.resolve();
  const result = previous.then(task, task);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  pendingByUser.set(userId, settled);
  void settled.then(() => {
    if (pendingByUser.get(userId) === settled) pendingByUser.delete(userId);
  });
  return result;
}

export async function joinPresence(
  io: Server,
  userId: string,
  socketId: string,
): Promise<void> {
  try {
    const transition = await withUserLock(userId, async () => {
      const keys = presenceKeys(userId);
      const reply: unknown = await redisClient.eval(JOIN_SCRIPT, {
        keys: [keys.set, keys.online, keys.token],
        arguments: [socketId],
      });
      return parseTransition(reply);
    });

    if (transition.changed) {
      io.emit("user_status", { userId, online: true });
    }
  } catch (error) {
    console.error("presence join error:", error);
  }
}

export async function leavePresence(
  io: Server,
  userId: string,
  socketId: string,
): Promise<boolean> {
  try {
    return await withUserLock(userId, async () => {
      const keys = presenceKeys(userId);
      const reply: unknown = await redisClient.eval(LEAVE_SCRIPT, {
        keys: [keys.set, keys.online, keys.token],
        arguments: [socketId],
      });
      const transition = parseTransition(reply);
      if (!transition.changed) return false;

      const lastSeen = new Date();
      try {
        await User.findByIdAndUpdate(userId, { lastSeen });
      } catch (error) {
        console.error("lastSeen update error:", error);
      }

      let currentToken: string | null = null;
      try {
        currentToken = await redisClient.get(keys.token);
      } catch (error) {
        console.error("presence token check error:", error);
      }

      // A newer join supersedes this leave; emitting offline then would clobber online state.
      if (currentToken === transition.token) {
        io.emit("user_status", { userId, online: false, lastSeen });
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error("presence leave error:", error);
    return false;
  }
}
