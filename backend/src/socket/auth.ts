import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { container } from "tsyringe";
import ChatService from "../services/chatService";
import GroupService from "../services/groupService";
import CallService from "../services/callService";
import GroupCallService from "../services/groupCallService";
import { isObjectId, parseCookieHeader } from "../utils/validation";

export interface SocketServices {
  chatService: ChatService;
  groupService: GroupService;
  callService: CallService;
  groupCallService: GroupCallService;
}

export interface AuthenticatedSocket {
  userId: string;
  services: SocketServices;
}

function resolveSocketServices(): SocketServices {
  return {
    chatService: container.resolve(ChatService),
    groupService: container.resolve(GroupService),
    callService: container.resolve(CallService),
    groupCallService: container.resolve(GroupCallService),
  };
}

export function authenticateSocket(socket: Socket): AuthenticatedSocket | null {
  const token = parseCookieHeader(socket.handshake.headers.cookie).accessToken;
  const accessSecret = process.env.JWT_ACCESS_SECRET;

  if (!token || !accessSecret) {
    socket.disconnect(true);
    return null;
  }

  let decoded: { userId?: unknown };
  try {
    decoded = jwt.verify(token, accessSecret) as { userId?: unknown };
  } catch {
    socket.disconnect(true);
    return null;
  }

  const userId = isObjectId(decoded.userId) ? decoded.userId : "";
  if (!userId) {
    socket.disconnect(true);
    return null;
  }

  socket.data.userId = userId;
  return { userId, services: resolveSocketServices() };
}
