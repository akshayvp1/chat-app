import type { Server } from "socket.io";

export type DirectCallUIStatus =
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "rejected"
  | "ended"
  | "missed";

export interface DirectCallStatePayload {
  callId: string;
  status: DirectCallUIStatus;
  from: string;
  callType?: "audio" | "video";
  reason?: string;
  originSocketId?: string;
  at: number;
}

export function emitDirectCallState(
  io: Server,
  callerId: string,
  receiverId: string,
  payload: DirectCallStatePayload,
): void {
  io.to(callerId).emit("call:state", payload);
  io.to(receiverId).emit("call:state", payload);
}
