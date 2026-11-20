import { Server, Socket } from "socket.io";
import redisClient from "../config/redis";
import GroupService from "../services/groupService";
import { isGroupMember } from "../utils/validation";

export function emitSendError(
  socket: Socket,
  event: "message_error" | "group_message_error",
  tempId?: string,
): void {
  socket.emit(event, tempId ? { tempId } : {});
}

export async function getMemberGroup(
  groupService: GroupService,
  groupId: string,
  userId: string,
) {
  const group = await groupService.getGroupById(groupId);
  if (!isGroupMember(group, userId)) {
    return null;
  }
  return group;
}

export async function isGroupCallParticipant(
  callId: string,
  userId: string,
): Promise<boolean> {
  const dbId = await redisClient.get(`groupcall:${callId}`);
  if (!dbId) {
    return false;
  }

  const members = await redisClient.sMembers(`groupcall:${callId}:members`);
  return members.includes(userId);
}

export async function getCallParticipants(callId: string) {
  const caller = await redisClient.get(`call:${callId}:caller`);
  const receiver = await redisClient.get(`call:${callId}:receiver`);
  if (!caller || !receiver) {
    return null;
  }
  return { caller, receiver };
}

export async function hasConnectedRecipient(
  io: Server,
  room: string,
  excludeUserId?: string,
): Promise<boolean> {
  try {
    const sockets = await io.to(room).fetchSockets();
    return sockets.some((candidate) => {
      const identity = candidate.data as { userId?: unknown };
      return typeof identity.userId !== "string" || identity.userId !== excludeUserId;
    });
  } catch {
    return false;
  }
}

export async function isCallSignalingAuthorized(
  userId: string,
  callId: string,
  to: string,
): Promise<boolean> {
  const participants = await getCallParticipants(callId);
  if (!participants) {
    return false;
  }
  if (userId === participants.caller) {
    return to === participants.receiver;
  }
  if (userId === participants.receiver) {
    return to === participants.caller;
  }
  return false;
}
