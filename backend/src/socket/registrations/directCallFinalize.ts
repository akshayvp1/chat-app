import type { Server } from "socket.io";
import redisClient from "../../config/redis";
import ChatService from "../../services/chatService";
import CallService from "../../services/callService";
import { emitDirectCallState } from "../callEvents";
import {
  clearConnectTimer,
  clearRingingTimer,
  DirectCallStatus,
  finishDirectCallFinalization,
  tryBeginDirectCallFinalization,
} from "../state";

export async function finalizeCall(
  io: Server,
  callService: CallService,
  chatService: ChatService,
  callId: string,
  status: DirectCallStatus,
  originSocketId?: string,
  actorId?: string,
): Promise<void> {
  if (!tryBeginDirectCallFinalization(callId)) return;

  try {
    clearRingingTimer(callId);
    clearConnectTimer(callId);

    const dbId = await redisClient.get(`call:${callId}`);
    if (!dbId) return;

    const call = await callService.endCall(dbId, status);
    if (!call) return;

    const callerId = String((call as any).callerId?._id ?? (call as any).callerId);
    const receiverId = String((call as any).receiverId?._id ?? (call as any).receiverId);
    const storedType = await redisClient.get(`call:${callId}:type`);
    const callType = storedType === "video" ? "video" : "audio";

    await redisClient.del(`call:${callId}`);
    await redisClient.del(`call:${callId}:type`);
    await redisClient.del(`call:${callId}:caller`);
    await redisClient.del(`call:${callId}:receiver`);
    await redisClient.del(`call:${callId}:callerSocket`);
    await redisClient.del(`call:${callId}:receiverSocket`);
    await redisClient.del(`callconnected:${callId}`);
    await redisClient.del(`callready:${callId}`);
    await redisClient.del(`activecall:${callerId}`);
    await redisClient.del(`activecall:${receiverId}`);

    emitDirectCallState(io, callerId, receiverId, {
      callId,
      status: status === "completed" ? "ended" : status,
      from: actorId ?? "server",
      callType,
      originSocketId,
      at: Date.now(),
    });

    const callMessage = await chatService.saveCallMessage(callerId, receiverId, {
      callType: (call as any).type,
      status,
      duration: (call as any).duration ?? 0,
    });

    io.to(callerId).emit("receive_message", {
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
    });
    io.to(receiverId).emit("receive_message", {
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
    });
  } catch (error) {
    console.error("finalizeCall error:", error);
  } finally {
    finishDirectCallFinalization(callId);
  }
}
