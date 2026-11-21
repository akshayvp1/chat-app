import type { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import {
  requireCallId,
  requireObjectId,
  requireRecord,
} from "../../utils/validation";
import {
  authorizeDirectCallSignal,
  DirectCallRole,
} from "../helpers";
import type { DirectCallStatePayload } from "../callEvents";

export interface ParsedDirectCallSignal {
  callId: string;
  to: string;
  role: DirectCallRole;
  callType: "audio" | "video";
  participants: { caller: string; receiver: string };
}

export function makeState(
  callId: string,
  status: DirectCallStatePayload["status"],
  from: string,
  reason?: string,
  originSocketId?: string,
  callType?: "audio" | "video",
): DirectCallStatePayload {
  return { callId, status, from, callType, reason, originSocketId, at: Date.now() };
}

export function emitUnavailable(
  socket: Socket,
  callId?: string,
  reason = "unavailable",
  callType?: "audio" | "video",
): void {
  socket.emit("call:unavailable", { callId, reason, callType });
}

export async function parseDirectCallSignal(
  io: Server,
  socket: Socket,
  data: unknown,
  label: string,
): Promise<ParsedDirectCallSignal | null> {
  try {
    const body = requireRecord(data, label);
    const callId = requireCallId(body.callId);
    const to = requireObjectId(body.to, "recipient ID");
    const role = await authorizeDirectCallSignal(
      (socket.data as { userId: string }).userId,
      callId,
      to,
      socket.id,
      io,
    );
    if (!role) {
      emitUnavailable(socket, callId, "stale");
      return null;
    }

    const caller = await redisClient.get(`call:${callId}:caller`);
    const receiver = await redisClient.get(`call:${callId}:receiver`);
    if (!caller || !receiver) {
      emitUnavailable(socket, callId, "stale");
      return null;
    }

    const storedType = await redisClient.get(`call:${callId}:type`);
    const callType = storedType === "video" ? "video" : "audio";

    return { callId, to, role, callType, participants: { caller, receiver } };
  } catch (error) {
    console.error(`${label} error:`, error);
    return null;
  }
}
