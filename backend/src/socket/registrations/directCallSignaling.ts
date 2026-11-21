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
    const signal = await parseDirectCallSignal(io, socket, data, "call:offer");
    if (!signal || signal.role !== "caller") return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale", signal.callType);
      return;
    }

    const body = requireRecord(data, "Call offer payload");
    if (!isRecord(body.offer)) {
      emitUnavailable(socket, signal.callId, "invalid-offer", signal.callType);
      return;
    }

    io.to(signal.to).emit("call:offer", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      callType: signal.callType,
      offer: body.offer,
    });
  });

  socket.on("call:answer", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:answer");
    if (!signal || signal.role !== "receiver") return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale", signal.callType);
      return;
    }

    const body = requireRecord(data, "Call answer payload");
    if (!isRecord(body.answer)) {
      emitUnavailable(socket, signal.callId, "invalid-answer", signal.callType);
      return;
    }

    io.to(signal.to).emit("call:answer", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      callType: signal.callType,
      answer: body.answer,
    });
  });

  socket.on("call:ice-candidate", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:ice-candidate");
    if (!signal) return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale", signal.callType);
      return;
    }

    const body = requireRecord(data, "Call candidate payload");
    if (!isRecord(body.candidate)) {
      emitUnavailable(socket, signal.callId, "invalid-candidate", signal.callType);
      return;
    }

    io.to(signal.to).emit("call:ice-candidate", {
      callId: signal.callId,
      to: signal.to,
      from: userId,
      callType: signal.callType,
      candidate: body.candidate,
    });
  });

  socket.on("call:ice-restart", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:ice-restart");
    if (!signal || signal.role !== "receiver") return;
    if (!(await redisClient.get(`callconnected:${signal.callId}`))) {
      emitUnavailable(socket, signal.callId, "stale", signal.callType);
      return;
    }

    io.to(signal.to).emit("call:ice-restart", {
      callId: signal.callId,
      from: userId,
      callType: signal.callType,
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

      const storedType = await redisClient.get(`call:${callId}:type`);
      const callType = storedType === "video" ? "video" : "audio";

      if (
        !role ||
        !caller ||
        !receiver ||
        getDirectCallCounterpart({ caller, receiver }, role) !== to
      ) {
        emitUnavailable(socket, callId, "stale", callType);
        return;
      }

      const ownerKey = directCallOwnerKey(callId, role);
      const owner = await redisClient.get(ownerKey);
      if (owner && !io.sockets.sockets.get(owner)) {
        await redisClient.set(ownerKey, socket.id);
      }
      const ready = await redisClient.get(`callready:${callId}`);
      const accepted = await redisClient.get(`callconnected:${callId}`);
      const status = ready
        ? "connected"
        : accepted
          ? "connecting"
          : role === "caller"
            ? "calling"
            : "ringing";

      if (role === "caller" && accepted && !ready) {
        socket.emit("call:accepted", { callId, from: receiver, callType });
      }

      socket.emit(
        "call:state",
        makeState(
          callId,
          status,
          userId,
          owner === socket.id || !(owner && io.sockets.sockets.get(owner)) ? "sync" : "stale-socket",
          undefined,
          callType,
        ),
      );
    } catch (error) {
      console.error("call:sync error:", error);
    }
  });
}
