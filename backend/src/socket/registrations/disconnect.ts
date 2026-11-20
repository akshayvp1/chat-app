import { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import GroupCallService from "../../services/groupCallService";
import { leavePresence } from "../presence";
import { clearRingingTimer, DirectCallStatus } from "../state";
import { clearSocketTyping } from "../typing";

export type FinalizeCall = (
  callId: string,
  status: DirectCallStatus,
) => Promise<void>;

export type FinalizeGroupCall = (
  callId: string,
  groupId: string,
) => Promise<void>;

export interface DisconnectDependencies {
  groupCallService: GroupCallService;
  finalizeCall: FinalizeCall;
  finalizeGroupCall: FinalizeGroupCall;
}

async function cleanupDirectCall(
  io: Server,
  userId: string,
  finalizeCall: FinalizeCall,
): Promise<void> {
  try {
    const activeCallId = await redisClient.get(`activecall:${userId}`);
    if (activeCallId) {
      clearRingingTimer(activeCallId);
      const wasConnected = await redisClient.get(`callconnected:${activeCallId}`);
      const finalStatus: DirectCallStatus = wasConnected ? "completed" : "missed";
      await finalizeCall(activeCallId, finalStatus);
      io.emit("call:ended", { callId: activeCallId });
    }
  } catch (error) {
    console.error("disconnect call cleanup error:", error);
  }
}

async function cleanupGroupCall(
  io: Server,
  userId: string,
  groupCallService: GroupCallService,
  finalizeGroupCall: FinalizeGroupCall,
): Promise<void> {
  try {
    const activeGroupCall = await redisClient.get(`usergroupcall:${userId}`);
    if (activeGroupCall) {
      const [callId, groupId] = activeGroupCall.split(":");
      await redisClient.del(`usergroupcall:${userId}`);
      await redisClient.sRem(`groupcall:${callId}:members`, userId);
      await redisClient.hDel(`groupcall:${callId}:names`, userId);

      const dbId = await redisClient.get(`groupcall:${callId}`);
      if (dbId) await groupCallService.leaveCall(dbId, userId);

      io.to(`group:${groupId}`).except(userId).emit("group_call:user-left", { callId, userId });

      const remaining = await redisClient.sCard(`groupcall:${callId}:members`);
      if (remaining === 0) {
        await finalizeGroupCall(callId, groupId);
      }
    }
  } catch (error) {
    console.error("disconnect group call cleanup error:", error);
  }
}

async function clearActiveCall(userId: string): Promise<void> {
  try {
    await redisClient.del(`activecall:${userId}`);
  } catch (error) {
    console.error("active call cleanup error:", error);
  }
}

export function registerDisconnectCleanup(
  io: Server,
  socket: Socket,
  userId: string,
  dependencies: DisconnectDependencies,
): void {
  const { groupCallService, finalizeCall, finalizeGroupCall } = dependencies;

  socket.on("disconnect", async () => {
    console.log(`❌ User disconnected: ${userId}`);

    clearSocketTyping(io, socket);

    const wasLastSocket = await leavePresence(io, userId, socket.id);
    if (!wasLastSocket) return;

    await cleanupDirectCall(io, userId, finalizeCall);
    await cleanupGroupCall(io, userId, groupCallService, finalizeGroupCall);
    await clearActiveCall(userId);
  });
}
