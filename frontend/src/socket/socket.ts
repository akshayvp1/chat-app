import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

let connectedUserId: string | null = null;

export function connectSocket(userId: string): void {
  if (!userId) return;

  if (connectedUserId && connectedUserId !== userId) {
    socket.disconnect();
  }

  connectedUserId = userId;
  socket.io.opts.query = { userId };

  if (!socket.connected && !socket.active) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  connectedUserId = null;
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
}
