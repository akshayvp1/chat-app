import { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import GroupCallService from "../../services/groupCallService";
import { directCallOwnerKey, getCallParticipants } from "../helpers";
import { leavePresence } from "../presence";
import {
  clearDirectDisconnectTimer,
  clearRingingTimer,
  DIRECT_DISCONNECT_GRACE_MS,
  DirectCallStatus,
  setDirectDisconnectTimer,
} from "../state";
import { clearSocketTyping } from "../typing";

export type FinalizeCall = (
  callId: string,
  status: DirectCallStatus,
  originSocketId?: string,
  actorId?: string,
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
  socket: Socket,
  userId: string,
  finalizeCall: FinalizeCall,
): Promise<boolean> {
  try {
    const activeCallId = await redisClient.get(`activecall:${userId}`);
    if (!activeCallId) return false;

    const participants = await getCallParticipants(activeCallId);
    if (!participants) return false;

    const role = userId === participants.caller ? "caller" : "receiver";
    const owner = await redisClient.get(directCallOwnerKey(activeCallId, role));
    if (owner && owner !== socket.id) return false;

    clearRingingTimer(activeCallId);
    const wasConnected = await redisClient.get(`callready:${activeCallId}`);
    const storedType = await redisClient.get(`call:${activeCallId}:type`);
    const callType = storedType === "video" ? "video" : "audio";
    const counterpart = role === "caller" ? participants.receiver : participants.caller;
    const key = `${activeCallId}:${userId}`;

    const finish = async () => {
      clearDirectDisconnectTimer(key);
      const currentOwner = await redisClient.get(directCallOwnerKey(activeCallId, role));
      if (currentOwner && io.sockets.sockets.get(currentOwner)) return;
      const finalStatus: DirectCallStatus = wasConnected ? "completed" : "missed";
      await finalizeCall(activeCallId, finalStatus, socket.id, userId);
      io.to(counterpart).emit("call:ended", {
        callId: activeCallId,
        from: userId,
        callType,
      });
      await clearActiveCall(userId);
    };

    if (wasConnected) {
      const timer = setTimeout(() => {
        void finish().catch((error) => {
          console.error("disconnect call grace error:", error);
        });
      }, DIRECT_DISCONNECT_GRACE_MS);
      setDirectDisconnectTimer(key, timer);
      return true;
    }

    await finish();
    return false;
  } catch (error) {
    console.error("disconnect call cleanup error:", error);
    return false;
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

    const directGrace = await cleanupDirectCall(io, socket, userId, finalizeCall);
    await cleanupGroupCall(io, userId, groupCallService, finalizeGroupCall);
    if (!directGrace) await clearActiveCall(userId);
  });
}
