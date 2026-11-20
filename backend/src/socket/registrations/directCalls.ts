import { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import ChatService from "../../services/chatService";
import CallService from "../../services/callService";
import {
  boundedString,
  isRecord,
  optionalTempId,
  requireCallId,
  requireCallType,
  requireObjectId,
  requireRecord,
} from "../../utils/validation";
import { isCallSignalingAuthorized } from "../helpers";
import {
  clearRingingTimer,
  DirectCallStatus,
  RING_TIMEOUT_MS,
  removeRingingTimer,
  setRingingTimer,
} from "../state";

export async function finalizeCall(
  io: Server,
  callService: CallService,
  chatService: ChatService,
  callId: string,
  status: DirectCallStatus,
): Promise<void> {
  try {
    clearRingingTimer(callId);

    const dbId = await redisClient.get(`call:${callId}`);
    if (!dbId) return;

    const call = await callService.endCall(dbId, status);
    if (!call) return;

    await redisClient.del(`call:${callId}`);
    await redisClient.del(`call:${callId}:caller`);
    await redisClient.del(`call:${callId}:receiver`);
    await redisClient.del(`callconnected:${callId}`);

    const callerId = String((call as any).callerId?._id ?? (call as any).callerId);
    const receiverId = String((call as any).receiverId?._id ?? (call as any).receiverId);
    await redisClient.del(`activecall:${callerId}`);
    await redisClient.del(`activecall:${receiverId}`);

    const callMessage = await chatService.saveCallMessage(callerId, receiverId, {
      callType: (call as any).type,
      status,
      duration: (call as any).duration ?? 0,
    });

    const messagePayload = {
      _id: callMessage._id.toString(),
      senderId: callerId,
      receiverId,
      text: "",
      type: "call" as const,
      call: {
        callType: (call as any).type,
        status,
        duration: (call as any).duration ?? 0,
      },
      seen: false,
      createdAt: callMessage.createdAt,
    };

    io.to(callerId).emit("receive_message", messagePayload);
    io.to(receiverId).emit("receive_message", messagePayload);
  } catch (error) {
    console.error("finalizeCall error:", error);
  }
}

export function registerDirectCallListeners(
  io: Server,
  socket: Socket,
  userId: string,
  chatService: ChatService,
  callService: CallService,
): void {
  socket.on("call:initiate", async (data: unknown) => {
    const fallbackCallId = isRecord(data) ? optionalTempId(data.callId) : undefined;

    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      const fromName = boundedString(body.fromName, "Display name", 1, 50);
      const type = requireCallType(body.type);

      if (to === userId) return;

      const payload = { callId, to, from: userId, fromName, type };
      const call = await callService.startCall(userId, to, type);
      await redisClient.set(`call:${callId}`, call._id.toString());
      await redisClient.set(`call:${callId}:caller`, userId);
      await redisClient.set(`call:${callId}:receiver`, to);
      await redisClient.set(`activecall:${userId}`, callId);
      await redisClient.set(`activecall:${to}`, callId);

      io.to(to).emit("call:incoming", payload);

      const timer = setTimeout(async () => {
        removeRingingTimer(callId);
        await finalizeCall(io, callService, chatService, callId, "missed");
        io.to(userId).emit("call:timeout", { callId });
        io.to(to).emit("call:cancelled", { callId });
      }, RING_TIMEOUT_MS);
      setRingingTimer(callId, timer);
    } catch (error) {
      console.error("call:initiate error:", error);
      socket.emit("call:unavailable", fallbackCallId ? { callId: fallbackCallId } : {});
    }
  });

  socket.on("call:accept", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");

      if (!(await isCallSignalingAuthorized(userId, callId, to))) return;

      clearRingingTimer(callId);
      await redisClient.set(`callconnected:${callId}`, "1");
      io.to(to).emit("call:accepted", { callId, from: userId });
    } catch (error) {
      console.error("call:accept error:", error);
    }
  });

  socket.on("call:reject", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");

      if (!(await isCallSignalingAuthorized(userId, callId, to))) return;

      clearRingingTimer(callId);
      await finalizeCall(io, callService, chatService, callId, "rejected");
      io.to(to).emit("call:rejected", { callId, from: userId });
    } catch (error) {
      console.error("call:reject error:", error);
    }
  });

  socket.on("call:cancel", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");

      if (!(await isCallSignalingAuthorized(userId, callId, to))) return;

      clearRingingTimer(callId);
      await finalizeCall(io, callService, chatService, callId, "missed");
      io.to(to).emit("call:cancelled", { callId });
    } catch (error) {
      console.error("call:cancel error:", error);
    }
  });

  socket.on("call:end", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");

      if (!(await isCallSignalingAuthorized(userId, callId, to))) return;

      clearRingingTimer(callId);
      await finalizeCall(io, callService, chatService, callId, "completed");
      io.to(to).emit("call:ended", { callId });
    } catch (error) {
      console.error("call:end error:", error);
    }
  });

  socket.on("call:offer", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call offer payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      if (!isRecord(body.offer)) throw new Error("Invalid offer");
      if (!(await isCallSignalingAuthorized(userId, callId, to))) {
        socket.emit("call:unavailable", { callId });
        return;
      }
      io.to(to).emit("call:offer", { callId, to, offer: body.offer });
    } catch (error) {
      console.error("call:offer error:", error);
    }
  });

  socket.on("call:answer", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call answer payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      if (!isRecord(body.answer)) throw new Error("Invalid answer");
      if (!(await isCallSignalingAuthorized(userId, callId, to))) {
        socket.emit("call:unavailable", { callId });
        return;
      }
      io.to(to).emit("call:answer", { callId, to, answer: body.answer });
    } catch (error) {
      console.error("call:answer error:", error);
    }
  });

  socket.on("call:ice-candidate", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Call candidate payload");
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      if (!isRecord(body.candidate)) throw new Error("Invalid candidate");
      if (!(await isCallSignalingAuthorized(userId, callId, to))) {
        socket.emit("call:unavailable", { callId });
        return;
      }
      io.to(to).emit("call:ice-candidate", {
        callId,
        to,
        candidate: body.candidate,
      });
    } catch (error) {
      console.error("call:ice-candidate error:", error);
    }
  });
}
