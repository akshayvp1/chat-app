import { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import GroupCallService from "../../services/groupCallService";
import GroupService from "../../services/groupService";
import {
  boundedString,
  isRecord,
  optionalTempId,
  requireCallId,
  requireCallType,
  requireObjectId,
  requireRecord,
} from "../../utils/validation";
import { getMemberGroup, isGroupCallParticipant } from "../helpers";
import {
  clearGroupRingingTimer,
  finishGroupCallFinalization,
  GroupCallStatus,
  RING_TIMEOUT_MS,
  removeGroupRingingTimer,
  setGroupRingingTimer,
  tryBeginGroupCallFinalization,
} from "../state";

type GroupCallSignalEvent = "group_call:offer" | "group_call:answer" | "group_call:ice-candidate";
type GroupCallSignalField = "offer" | "answer" | "candidate";

export async function finalizeGroupCall(
  io: Server,
  groupCallService: GroupCallService,
  groupService: GroupService,
  callId: string,
  groupId: string,
): Promise<void> {
  if (!tryBeginGroupCallFinalization(callId)) return;

  try {
    clearGroupRingingTimer(callId);

    const dbId = await redisClient.get(`groupcall:${callId}`);
    if (!dbId) return;

    const wasConnected = await redisClient.get(`groupcall:${callId}:connected`);
    const status: GroupCallStatus = wasConnected ? "completed" : "missed";

    const call = await groupCallService.endCall(dbId, status);
    if (!call) return;

    await redisClient.del(`groupcall:${callId}`);
    await redisClient.del(`groupcall:${callId}:members`);
    await redisClient.del(`groupcall:${callId}:names`);
    await redisClient.del(`groupcall:${callId}:connected`);

    const currentActive = await redisClient.get(`activegroupcall:${groupId}`);
    if (currentActive === callId) {
      await redisClient.del(`activegroupcall:${groupId}`);
    }

    const participantCount = new Set((call as any).participants.map((p: any) => String(p.userId?._id ?? p.userId))).size;
    const initiatorId = String((call as any).initiatorId?._id ?? (call as any).initiatorId);

    const callMessage = await groupService.saveGroupCallMessage(groupId, initiatorId, {
      callType: (call as any).type,
      status,
      duration: (call as any).duration ?? 0,
      participantCount,
    });

    const messagePayload = {
      _id: callMessage._id.toString(),
      groupId,
      senderId: initiatorId,
      senderName: callMessage.senderName,
      text: "",
      type: "call" as const,
      call: {
        callType: (call as any).type,
        status,
        duration: (call as any).duration ?? 0,
        participantCount,
      },
      seenBy: [],
      createdAt: callMessage.createdAt,
    };

    io.to(`group:${groupId}`).emit("receive_group_message", messagePayload);
    io.to(`group:${groupId}`).emit("group_call:ended", { callId, groupId });
  } catch (error) {
    console.error("finalizeGroupCall error:", error);
  } finally {
    finishGroupCallFinalization(callId);
  }
}

function registerGroupCallSignal(
  io: Server,
  socket: Socket,
  userId: string,
  event: GroupCallSignalEvent,
  payloadLabel: string,
  field: GroupCallSignalField,
  invalidMessage: string,
  errorLabel: string,
): void {
  socket.on(event, async (data: unknown) => {
    try {
      const body = requireRecord(data, payloadLabel);
      const callId = requireCallId(body.callId);
      const to = requireObjectId(body.to, "recipient ID");
      if (!isRecord(body[field])) throw new Error(invalidMessage);
      if (
        !(await isGroupCallParticipant(callId, userId)) ||
        !(await isGroupCallParticipant(callId, to))
      ) return;
      io.to(to).emit(event, { ...body, from: userId });
    } catch (error) {
      console.error(errorLabel, error);
    }
  });
}

export function registerGroupCallListeners(
  io: Server,
  socket: Socket,
  userId: string,
  groupService: GroupService,
  groupCallService: GroupCallService,
): void {
  socket.on("group_call:initiate", async (data: unknown) => {
    const fallbackCallId = isRecord(data) ? optionalTempId(data.callId) : undefined;

    try {
      const body = requireRecord(data, "Group call payload");
      const callId = requireCallId(body.callId);
      const groupId = requireObjectId(body.groupId, "group ID");
      const fromName = boundedString(body.fromName, "Display name", 1, 50);
      const type = requireCallType(body.type);
      const group = await getMemberGroup(groupService, groupId, userId);

      if (!group) { socket.emit("group_call:unavailable", { callId }); return; }

      const existingCallId = await redisClient.get(`activegroupcall:${groupId}`);
      if (existingCallId) {
        socket.emit("group_call:join-existing", { callId: existingCallId, groupId, type });
        return;
      }

      const call = await groupCallService.startCall(groupId, userId, type);

      await redisClient.set(`groupcall:${callId}`, call._id.toString());
      await redisClient.set(`activegroupcall:${groupId}`, callId);
      await redisClient.set(`usergroupcall:${userId}`, `${callId}:${groupId}`);
      await redisClient.sAdd(`groupcall:${callId}:members`, userId);
      await redisClient.hSet(`groupcall:${callId}:names`, userId, fromName);

      socket.emit("group_call:initiated", { callId, groupId, type });
      io.to(`group:${groupId}`).except(userId).emit("group_call:incoming", { callId, groupId, from: userId, fromName, type });

      const timer = setTimeout(async () => {
        removeGroupRingingTimer(callId);
        const memberCount = await redisClient.sCard(`groupcall:${callId}:members`);
        if (memberCount <= 1) await finalizeGroupCall(io, groupCallService, groupService, callId, groupId);
      }, RING_TIMEOUT_MS);
      setGroupRingingTimer(callId, timer);
    } catch (error) {
      console.error("group_call:initiate error:", error);
      socket.emit("group_call:unavailable", fallbackCallId ? { callId: fallbackCallId } : {});
    }
  });

  socket.on("group_call:join", async (data: unknown) => {
    const fallbackCallId = isRecord(data) ? optionalTempId(data.callId) : undefined;

    try {
      const body = requireRecord(data, "Group call payload");
      const callId = requireCallId(body.callId);
      const groupId = requireObjectId(body.groupId, "group ID");
      const userName = boundedString(body.userName, "Display name", 1, 50);
      const group = await getMemberGroup(groupService, groupId, userId);

      if (!group) { socket.emit("group_call:unavailable", { callId }); return; }

      const dbId = await redisClient.get(`groupcall:${callId}`);
      const activeCallId = await redisClient.get(`activegroupcall:${groupId}`);
      if (!dbId || activeCallId !== callId) { socket.emit("group_call:unavailable", { callId }); return; }

      clearGroupRingingTimer(callId);

      const existingMemberIds = await redisClient.sMembers(`groupcall:${callId}:members`);
      const namesMap = (await redisClient.hGetAll(`groupcall:${callId}:names`)) ?? {};

      const alreadyMember = existingMemberIds.includes(userId);
      if (!alreadyMember) {
        await redisClient.sAdd(`groupcall:${callId}:members`, userId);
        await redisClient.hSet(`groupcall:${callId}:names`, userId, userName);
        await groupCallService.joinCall(dbId, userId);
      }

      await redisClient.set(`usergroupcall:${userId}`, `${callId}:${groupId}`);

      const memberCount = await redisClient.sCard(`groupcall:${callId}:members`);
      if (memberCount >= 2) {
        await redisClient.set(`groupcall:${callId}:connected`, "1");
        await groupCallService.markOngoing(dbId);
      }

      socket.emit("group_call:existing-participants", {
        callId,
        participants: existingMemberIds
          .filter((id) => id !== userId)
          .map((id) => ({ userId: id, userName: namesMap[id] ?? "Unknown" })),
      });
      io.to(`group:${groupId}`).except(userId).emit("group_call:user-joined", { callId, userId, userName });
    } catch (error) {
      console.error("group_call:join error:", error);
      socket.emit("group_call:unavailable", fallbackCallId ? { callId: fallbackCallId } : {});
    }
  });

  socket.on("group_call:leave", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Group call payload");
      const callId = requireCallId(body.callId);
      const groupId = requireObjectId(body.groupId, "group ID");
      const activeCall = await redisClient.get(`usergroupcall:${userId}`);

      if (activeCall !== `${callId}:${groupId}`) return;

      const dbId = await redisClient.get(`groupcall:${callId}`);
      await redisClient.sRem(`groupcall:${callId}:members`, userId);
      await redisClient.hDel(`groupcall:${callId}:names`, userId);
      await redisClient.del(`usergroupcall:${userId}`);

      if (dbId) await groupCallService.leaveCall(dbId, userId);

      io.to(`group:${groupId}`).except(userId).emit("group_call:user-left", { callId, userId });

      const remaining = await redisClient.sCard(`groupcall:${callId}:members`);
      if (remaining === 0) await finalizeGroupCall(io, groupCallService, groupService, callId, groupId);
    } catch (error) {
      console.error("group_call:leave error:", error);
    }
  });

  registerGroupCallSignal(io, socket, userId, "group_call:offer", "Group call offer payload", "offer", "Invalid offer", "group_call:offer error:");
  registerGroupCallSignal(io, socket, userId, "group_call:answer", "Group call answer payload", "answer", "Invalid answer", "group_call:answer error:");
  registerGroupCallSignal(io, socket, userId, "group_call:ice-candidate", "Group call candidate payload", "candidate", "Invalid candidate", "group_call:ice-candidate error:");
}
