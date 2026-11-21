import type { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import ChatService from "../../services/chatService";
import CallService from "../../services/callService";
import {
  boundedString,
  isRecord,
  requireCallId,
  requireCallType,
  requireObjectId,
  requireRecord,
} from "../../utils/validation";
import {
  directCallOwnerKey,
  hasActiveDirectCall,
  hasConnectedRecipient,
} from "../helpers";
import { emitDirectCallState } from "../callEvents";
import {
  clearConnectTimer,
  clearRingingTimer,
  CONNECT_TIMEOUT_MS,
  RING_TIMEOUT_MS,
  removeConnectTimer,
  removeRingingTimer,
  setConnectTimer,
  setRingingTimer,
} from "../state";
import { finalizeCall } from "./directCallFinalize";
import {
  emitUnavailable,
  makeState,
  parseDirectCallSignal,
} from "./directCallProtocol";

export function registerDirectCallLifecycle(
  io: Server,
  socket: Socket,
  userId: string,
  chatService: ChatService,
  callService: CallService,
): void {
  socket.on("call:initiate", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      const fromName = boundedString(body.fromName, "Display name", 1, 50);
      const type = requireCallType(body.type);

      if (to === userId) return;

      if ((await hasActiveDirectCall(userId)) || (await hasActiveDirectCall(to))) {
        emitUnavailable(socket, callId, "busy", type);
        io.to(userId).emit("call:state", makeState(callId, "missed", userId, "busy", undefined, type));
        return;
      }

      if (await redisClient.get(`call:${callId}`)) {
        emitUnavailable(socket, callId, "duplicate", type);
        return;
      }

      if (!(await hasConnectedRecipient(io, to))) {
        emitUnavailable(socket, callId, "offline", type);
        io.to(userId).emit("call:state", makeState(callId, "missed", userId, "offline", undefined, type));
        return;
      }

      const call = await callService.startCall(userId, to, type);
      await redisClient.set(`call:${callId}`, call._id.toString());
      await redisClient.set(`call:${callId}:caller`, userId);
      await redisClient.set(`call:${callId}:receiver`, to);
      await redisClient.set(`call:${callId}:type`, type);
      await redisClient.set(directCallOwnerKey(callId, "caller"), socket.id);
      await redisClient.set(`activecall:${userId}`, callId);
      await redisClient.set(`activecall:${to}`, callId);

      io.to(userId).emit("call:state", makeState(callId, "calling", userId, undefined, socket.id, type));
      io.to(to).emit("call:incoming", { callId, to, from: userId, fromName, type });
      io.to(to).emit("call:state", makeState(callId, "ringing", userId, undefined, undefined, type));

      const timer = setTimeout(async () => {
        removeRingingTimer(callId);
        try {
          if (!(await redisClient.get(`call:${callId}`))) return;
          await finalizeCall(io, callService, chatService, callId, "missed", undefined, userId);
          io.to(userId).emit("call:timeout", { callId, callType: type });
          io.to(to).emit("call:cancelled", { callId, callType: type });
        } catch (error) {
          console.error("call timeout error:", error);
        }
      }, RING_TIMEOUT_MS);
      setRingingTimer(callId, timer);
    } catch (error) {
      console.error("call:initiate error:", error);
      emitUnavailable(socket, isRecord(data) ? String(data.callId ?? "") || undefined : undefined);
    }
  });

  socket.on("call:accept", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:accept");
    if (!signal || signal.role !== "receiver") return;
    if (await redisClient.get(`callconnected:${signal.callId}`)) return;

    clearRingingTimer(signal.callId);
    await redisClient.set(directCallOwnerKey(signal.callId, "receiver"), socket.id);
    await redisClient.set(`callconnected:${signal.callId}`, "1");

    const connectTimer = setTimeout(async () => {
      removeConnectTimer(signal.callId);
      try {
        if (!(await redisClient.get(`call:${signal.callId}`))) return;
        if (await redisClient.get(`callready:${signal.callId}`)) return;
        await finalizeCall(
          io,
          callService,
          chatService,
          signal.callId,
          "missed",
          undefined,
          signal.participants.receiver,
        );
        io.to(signal.participants.caller).emit("call:timeout", { callId: signal.callId, callType: signal.callType });
        io.to(signal.participants.receiver).emit("call:cancelled", { callId: signal.callId, callType: signal.callType });
      } catch (error) {
        console.error("call connect timeout error:", error);
      }
    }, CONNECT_TIMEOUT_MS);
    setConnectTimer(signal.callId, connectTimer);

    emitDirectCallState(
      io,
      signal.participants.caller,
      signal.participants.receiver,
      makeState(signal.callId, "connecting", userId, undefined, socket.id, signal.callType),
    );
    io.to(signal.to).emit("call:accepted", {
      callId: signal.callId,
      from: userId,
      callType: signal.callType,
    });
  });

  socket.on("call:connected", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:connected");
    if (!signal || !(await redisClient.get(`callconnected:${signal.callId}`))) return;

    clearConnectTimer(signal.callId);
    await redisClient.set(`callready:${signal.callId}`, "1");
    emitDirectCallState(
      io,
      signal.participants.caller,
      signal.participants.receiver,
      makeState(signal.callId, "connected", userId, undefined, socket.id, signal.callType),
    );
  });

  socket.on("call:reject", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:reject");
    if (!signal || signal.role !== "receiver") return;
    if (await redisClient.get(`callconnected:${signal.callId}`)) return;

    clearRingingTimer(signal.callId);
    await finalizeCall(
      io,
      callService,
      chatService,
      signal.callId,
      "rejected",
      socket.id,
      userId,
    );
    io.to(signal.to).emit("call:rejected", { callId: signal.callId, from: userId, callType: signal.callType });
  });

  socket.on("call:cancel", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:cancel");
    if (!signal || signal.role !== "caller") return;
    if (await redisClient.get(`callconnected:${signal.callId}`)) return;

    clearRingingTimer(signal.callId);
    await finalizeCall(
      io,
      callService,
      chatService,
      signal.callId,
      "missed",
      socket.id,
      userId,
    );
    io.to(signal.to).emit("call:cancelled", { callId: signal.callId, from: userId, callType: signal.callType });
  });

  socket.on("call:end", async (data: unknown) => {
    const signal = await parseDirectCallSignal(io, socket, data, "call:end");
    if (!signal) return;

    clearRingingTimer(signal.callId);
    const wasConnected = await redisClient.get(`callready:${signal.callId}`);
    await finalizeCall(
      io,
      callService,
      chatService,
      signal.callId,
      wasConnected ? "completed" : "missed",
      socket.id,
      userId,
    );
    io.to(signal.to).emit("call:ended", { callId: signal.callId, from: userId, callType: signal.callType });
  });
}
