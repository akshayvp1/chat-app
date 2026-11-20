import { useCallback, useState } from "react";

import { socket } from "@/socket/socket";

interface UserStatusPayload {
  userId: string;
  online: boolean;
  lastSeen?: string | Date | null;
}

export function useChatPresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const requestOnlineUsers = useCallback(() => {
    if (socket.connected) {
      socket.emit("get_online_users");
    }
  }, []);

  const onUserStatus = useCallback(({ userId, online }: UserStatusPayload) => {
    setOnlineUsers((prev) => {
      const next = new Set(prev);

      if (online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  }, []);

  const onOnlineUsers = useCallback((userIds: string[]) => {
    setOnlineUsers(new Set(userIds));
  }, []);

  const clearOnlineUsers = useCallback(() => {
    setOnlineUsers(new Set());
  }, []);

  return {
    onlineUsers,
    requestOnlineUsers,
    onUserStatus,
    onOnlineUsers,
    clearOnlineUsers,
  };
}
