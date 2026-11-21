import type { Server, Socket } from "socket.io";
import ChatService from "../../services/chatService";
import CallService from "../../services/callService";
import { registerDirectCallLifecycle } from "./directCallLifecycle";
import { registerDirectCallSignaling } from "./directCallSignaling";

export function registerDirectCallListeners(
  io: Server,
  socket: Socket,
  userId: string,
  chatService: ChatService,
  callService: CallService,
): void {
  registerDirectCallLifecycle(io, socket, userId, chatService, callService);
  registerDirectCallSignaling(io, socket, userId);
}
