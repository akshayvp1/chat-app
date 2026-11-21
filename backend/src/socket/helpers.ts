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
  return (await authorizeDirectCallSignal(userId, callId, to)) !== null;
}

export type DirectCallRole = "caller" | "receiver";

export function directCallOwnerKey(callId: string, role: DirectCallRole): string {
  return `call:${callId}:${role}Socket`;
}

export async function getDirectCallRole(
  userId: string,
  callId: string,
): Promise<DirectCallRole | null> {
  const participants = await getCallParticipants(callId);
  if (!participants) return null;
  if (userId === participants.caller) return "caller";
  if (userId === participants.receiver) return "receiver";
  return null;
}

export function getDirectCallCounterpart(
  participants: { caller: string; receiver: string },
  role: DirectCallRole,
): string {
  return role === "caller" ? participants.receiver : participants.caller;
}

export async function authorizeDirectCallSignal(
  userId: string,
  callId: string,
  to: string,
  socketId?: string,
): Promise<DirectCallRole | null> {
  const participants = await getCallParticipants(callId);
  if (!participants) return null;

  const role = await getDirectCallRole(userId, callId);
  if (!role) return null;
  if (getDirectCallCounterpart(participants, role) !== to) return null;

  const owner = await redisClient.get(directCallOwnerKey(callId, role));
  if (owner && socketId && owner !== socketId) return null;

  return role;
}

export async function clearStaleActiveCall(userId: string): Promise<void> {
  try {
    const callId = await redisClient.get(`activecall:${userId}`);
    if (callId && !(await redisClient.get(`call:${callId}`))) {
      await redisClient.del(`activecall:${userId}`);
    }
  } catch (error) {
    console.error("stale active call cleanup error:", error);
  }
}

export async function hasActiveDirectCall(userId: string): Promise<boolean> {
  await clearStaleActiveCall(userId);
  return Boolean(await redisClient.get(`activecall:${userId}`));
}
