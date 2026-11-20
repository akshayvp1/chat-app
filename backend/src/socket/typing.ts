import { Server, Socket } from "socket.io";
import GroupService from "../services/groupService";
import { boundedString, requireObjectId, requireRecord } from "../utils/validation";
import { getMemberGroup } from "./helpers";

const TYPING_THROTTLE_MS = 800;
const TYPING_TTL_MS = 2500;

type EmitTyping = (io: Server) => void;
type Timer = ReturnType<typeof setTimeout>;

interface TypingEntry {
  timer?: Timer;
  stop: EmitTyping;
  lastSent: number;
}

const typingBySocket = new Map<string, Map<string, TypingEntry>>();

function touchTyping(
  io: Server,
  socket: Socket,
  key: string,
  start: EmitTyping,
  stop: EmitTyping,
): void {
  const now = Date.now();
  let entries = typingBySocket.get(socket.id);
  if (!entries) {
    entries = new Map<string, TypingEntry>();
    typingBySocket.set(socket.id, entries);
  }

  const existing = entries.get(key);
  const shouldEmit = !existing || now - existing.lastSent >= TYPING_THROTTLE_MS;
  if (shouldEmit) start(io);
  if (existing) clearTimeout(existing.timer);

  const entry: TypingEntry = {
    stop,
    lastSent: shouldEmit ? now : existing?.lastSent ?? 0,
  };
  entry.timer = setTimeout(() => {
    const currentEntries = typingBySocket.get(socket.id);
    if (currentEntries?.get(key) !== entry) return;
    currentEntries.delete(key);
    if (currentEntries.size === 0) typingBySocket.delete(socket.id);
    entry.stop(io);
  }, TYPING_TTL_MS);
  entries.set(key, entry);
}

function stopTyping(socket: Socket, key: string): void {
  const entries = typingBySocket.get(socket.id);
  const entry = entries?.get(key);
  if (entry) clearTimeout(entry.timer);
  entries?.delete(key);
  if (entries?.size === 0) typingBySocket.delete(socket.id);
}

export function clearSocketTyping(io: Server, socket: Socket): void {
  const entries = typingBySocket.get(socket.id);
  if (!entries) return;
  typingBySocket.delete(socket.id);
  for (const entry of entries.values()) {
    clearTimeout(entry.timer);
    entry.stop(io);
  }
}

export function registerTypingListeners(
  io: Server,
  socket: Socket,
  userId: string,
  groupService: GroupService,
): void {
  socket.on("typing", (data: unknown) => {
    try {
      const body = requireRecord(data, "Typing payload");
      const to = requireObjectId(body.to, "recipient ID");
      if (to === userId) return;
      touchTyping(
        io,
        socket,
        `direct:${to}`,
        (server) => server.to(to).emit("typing", { from: userId }),
        (server) => server.to(to).emit("stop_typing", { from: userId }),
      );
    } catch (error) {
      console.error("typing error:", error);
    }
  });

  socket.on("stop_typing", (data: unknown) => {
    try {
      const body = requireRecord(data, "Typing payload");
      const to = requireObjectId(body.to, "recipient ID");
      if (to === userId) return;
      stopTyping(socket, `direct:${to}`);
      io.to(to).emit("stop_typing", { from: userId });
    } catch (error) {
      console.error("stop_typing error:", error);
    }
  });

  socket.on("group_typing", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Group typing payload");
      const groupId = requireObjectId(body.groupId, "group ID");
      const fromName = boundedString(body.fromName, "Display name", 1, 50);
      const group = await getMemberGroup(groupService, groupId, userId);
      if (!group) return;
      const room = `group:${groupId}`;
      touchTyping(
        io,
        socket,
        room,
        (server) => server.to(room).except(userId).emit("group_typing", { groupId, from: userId, fromName }),
        (server) => server.to(room).except(userId).emit("group_stop_typing", { groupId, from: userId }),
      );
    } catch (error) {
      console.error("group_typing error:", error);
    }
  });

  socket.on("group_stop_typing", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Group typing payload");
      const groupId = requireObjectId(body.groupId, "group ID");
      const group = await getMemberGroup(groupService, groupId, userId);
      if (!group) return;
      stopTyping(socket, `group:${groupId}`);
      io.to(`group:${groupId}`).except(userId).emit("group_stop_typing", { groupId, from: userId });
    } catch (error) {
      console.error("group_stop_typing error:", error);
    }
  });
}
