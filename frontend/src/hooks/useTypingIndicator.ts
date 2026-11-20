import { useCallback, useEffect, useRef } from "react";

import { socket } from "@/socket/socket";

interface UseTypingIndicatorParams {
  routingKey: string;
  currentUserId: string;
  kind: "direct" | "group";
  senderName: string;
  ready: boolean;
}

const TYPING_IDLE_MS = 1500;

export function useTypingIndicator({
  routingKey,
  currentUserId,
  kind,
  senderName,
  ready,
}: UseTypingIndicatorParams) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);

  const emitStopTyping = useCallback(() => {
    if (!socket.connected || !routingKey || !currentUserId) return;

    if (kind === "direct") {
      socket.emit("stop_typing", { to: routingKey, from: currentUserId });
    } else {
      socket.emit("group_stop_typing", { groupId: routingKey, from: currentUserId });
    }
  }, [kind, routingKey, currentUserId]);

  const clearTypingState = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingActiveRef.current = false;
  }, []);

  const stopTyping = useCallback(() => {
    if (typingActiveRef.current) {
      emitStopTyping();
    }
    clearTypingState();
  }, [clearTypingState, emitStopTyping]);

  const notifyTyping = useCallback(() => {
    if (!ready || !currentUserId || !routingKey || !socket.connected) return;

    if (!typingActiveRef.current) {
      if (kind === "direct") {
        socket.emit("typing", { to: routingKey, from: currentUserId });
      } else {
        socket.emit("group_typing", {
          groupId: routingKey,
          from: currentUserId,
          fromName: senderName,
        });
      }
      typingActiveRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
      typingActiveRef.current = false;
      typingTimeoutRef.current = null;
    }, TYPING_IDLE_MS);
  }, [ready, currentUserId, routingKey, kind, senderName, emitStopTyping]);

  useEffect(() => {
    const onDisconnect = () => clearTypingState();

    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("disconnect", onDisconnect);
      stopTyping();
    };
  }, [clearTypingState, stopTyping]);

  return { clearTypingState, stopTyping, notifyTyping };
}
