import type { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import {
  isRecord,
  requireCallId,
  requireObjectId,
  requireRecord,
} from "../../utils/validation";
import {
  authorizeDirectCallSignal,
  directCallOwnerKey,
  getDirectCallCounterpart,
  getDirectCallRole,
} from "../helpers";
import {
  emitUnavailable,
  makeState,
  parseDirectCallSignal,
} from "./directCallProtocol";

export function registerDirectCallSignaling(
  io: Server,
  socket: Socket,
  userId: string,
): void {
  socket.on("call:offer", async (data: unknown) => {
    const signal = await parseDirectCallSignal(socket, data, "call:offer");
    if (!signal || signal.role !== "caller") return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale");
      return;
    }

    const body = requireRecord(data, "Call offer payload");
    if (!isRecord(body.offer)) {
      emitUnavailable(socket, signal.callId, "invalid-offer");
      return;
    }

    io.to(signal.to).emit("call:offer", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      offer: body.offer,
    });
  });

  socket.on("call:answer", async (data: unknown) => {
    const signal = await parseDirectCallSignal(socket, data, "call:answer");
    if (!signal || signal.role !== "receiver") return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale");
      return;
    }

    const body = requireRecord(data, "Call answer payload");
    if (!isRecord(body.answer)) {
      emitUnavailable(socket, signal.callId, "invalid-answer");
      return;
    }

    io.to(signal.to).emit("call:answer", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      answer: body.answer,
    });
  });

  socket.on("call:ice-candidate", async (data: unknown) => {
    const signal = await parseDirectCallSignal(socket, data, "call:ice-candidate");
    if (!signal) return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale");
      return;
    }

    const body = requireRecord(data, "Call candidate payload");
    if (!isRecord(body.candidate)) {
      emitUnavailable(socket, signal.callId, "invalid-candidate");
      return;
    }

    io.to(signal.to).emit("call:ice-candidate", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      candidate: body.candidate,
    });
  });

  socket.on("call:sync", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call sync payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      const role = await getDirectCallRole(userId, callId);
      const caller = await redisClient.get(`call:${callId}:caller`);
      const receiver = await redisClient.get(`call:${callId}:receiver`);

      if (
        !role ||
        !caller ||
        !receiver ||
        getDirectCallCounterpart({ caller, receiver }, role) !== to
      ) {
        emitUnavailable(socket, callId, "stale");
        return;
      }

      const owner = await redisClient.get(directCallOwnerKey(callId, role));
      const ready = await redisClient.get(`callready:${callId}`);
      const accepted = await redisClient.get(`callconnected:${callId}`);
      const status = ready
        ? "connected"
        : accepted
          ? "connecting"
          : role === "caller"
            ? "calling"
            : "ringing";

      socket.emit(
        "call:state",
        makeState(callId, status, userId, owner === socket.id ? "sync" : "stale-socket"),
      );
    } catch (error) {
      console.error("call:sync error:", error);
    }
  });
}
