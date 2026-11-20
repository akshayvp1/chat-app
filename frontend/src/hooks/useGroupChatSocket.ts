import { useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch } from "../redux/hooks";
import {
  addGroupMessage,
  clearGroupUnread,
  markGroupMessageDelivered,
  markGroupMessageError,
  markGroupMessagesSeen,
  replaceGroupMessage,
  setGroupMessages,
  setGroupUnreadCount,
} from "../redux/slices/groupSlice";
import groupService from "../services/user/groupService";
import { socket } from "@/socket/socket";
import type { Group, GroupMessage } from "../types/types";

interface UseGroupChatSocketParams {
  selectedGroup: Group;
  currentUserId: string;
}

export function useGroupChatSocket({
  selectedGroup,
  currentUserId,
}: UseGroupChatSocketParams) {
  const dispatch = useAppDispatch();
  const selectedGroupId = selectedGroup._id;

  const [typingState, setTypingState] = useState<{
    groupId: string;
    users: Map<string, string>;
  }>(() => ({ groupId: selectedGroupId, users: new Map() }));

  const selectedGroupRef = useRef<Group | null>(null);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const clearTypingTimers = useCallback(() => {
    typingTimersRef.current.forEach((timer) => clearTimeout(timer));
    typingTimersRef.current.clear();
  }, []);

  const clearTypingUsers = useCallback((groupId: string) => {
    clearTypingTimers();
    setTypingState({ groupId, users: new Map() });
  }, [clearTypingTimers]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      const res = await groupService.getGroupMessages(selectedGroupId);

      if (
        cancelled ||
        selectedGroupRef.current?._id !== selectedGroupId
      ) {
        return;
      }

      if (res.success && res.data) {
        const loaded: GroupMessage[] = res.data.map((m) => ({
          ...m,
          status: m.seenBy.length > 1 ? ("read" as const) : ("sent" as const),
        }));
        dispatch(setGroupMessages(loaded));

        const unseenMessages = loaded.filter(
          (m) =>
            m.senderId !== currentUserId &&
            !m.seenBy.includes(currentUserId),
        );

        const unseenIds = unseenMessages.slice(0, 100).map((m) => m._id);

        if (unseenIds.length > 0) {
          socket.emit("mark_group_seen", {
            messageIds: unseenIds,
            groupId: selectedGroupId,
          });
        }

        if (unseenMessages.length > 100) {
          dispatch(
            setGroupUnreadCount({
              [selectedGroupId]: unseenMessages.length - 100,
            }),
          );
        } else {
          dispatch(clearGroupUnread(selectedGroupId));
        }
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, dispatch, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    function onConnect() {
      socket.emit("join_groups", [selectedGroupId]);
    }

    function onDisconnect() {
      clearTypingUsers(selectedGroupId);
    }

    onConnect();

    function onReceiveGroupMessage(payload: GroupMessage) {
      if (payload.groupId !== selectedGroupRef.current?._id) return;
      dispatch(addGroupMessage({ ...payload, status: "sent" }));

      if (payload.senderId !== currentUserId) {
        socket.emit("mark_group_seen", {
          messageIds: [payload._id],
          groupId: payload.groupId,
        });
      }

      dispatch(clearGroupUnread(payload.groupId));
    }

    function onGroupMessageSent(payload: GroupMessage) {
      dispatch(replaceGroupMessage({ ...payload, status: "sent" }));
    }

    function onGroupMessageDelivered(payload: {
      messageId: string;
      tempId?: string;
    }) {
      dispatch(markGroupMessageDelivered(payload));
    }

    function onGroupMessagesSeen(payload: { messageIds: string[] }) {
      dispatch(markGroupMessagesSeen(payload.messageIds));
    }

    function onGroupMessageError({ tempId }: { tempId: string }) {
      dispatch(markGroupMessageError(tempId));
    }

    function onGroupTyping({
      from,
      fromName,
      groupId,
    }: {
      from: string;
      fromName: string;
      groupId: string;
    }) {
      if (from === currentUserId || groupId !== selectedGroupRef.current?._id) {
        return;
      }

      const existingTimer = typingTimersRef.current.get(from);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      typingTimersRef.current.set(
        from,
        setTimeout(() => {
          typingTimersRef.current.delete(from);
          setTypingState((prev) => {
            if (prev.groupId !== groupId || !prev.users.has(from)) return prev;
            const next = new Map(prev.users);
            next.delete(from);
            return { groupId, users: next };
          });
        }, 3000),
      );

      setTypingState((prev) => {
        const users =
          prev.groupId === groupId ? prev.users : new Map<string, string>();
        const next = new Map(users);
        next.set(from, fromName);
        return { groupId, users: next };
      });
    }

    function onGroupStopTyping({
      from,
      groupId,
    }: {
      from: string;
      groupId: string;
    }) {
      if (from === currentUserId || groupId !== selectedGroupRef.current?._id) {
        return;
      }

      const timer = typingTimersRef.current.get(from);
      if (timer) {
        clearTimeout(timer);
        typingTimersRef.current.delete(from);
      }

      setTypingState((prev) => {
        const users =
          prev.groupId === groupId ? prev.users : new Map<string, string>();
        const next = new Map(users);
        next.delete(from);
        return { groupId, users: next };
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_group_message", onReceiveGroupMessage);
    socket.on("group_message_sent", onGroupMessageSent);
    socket.on("group_message_delivered", onGroupMessageDelivered);
    socket.on("group_messages_seen", onGroupMessagesSeen);
    socket.on("group_message_error", onGroupMessageError);
    socket.on("group_typing", onGroupTyping);
    socket.on("group_stop_typing", onGroupStopTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_group_message", onReceiveGroupMessage);
      socket.off("group_message_sent", onGroupMessageSent);
      socket.off("group_message_delivered", onGroupMessageDelivered);
      socket.off("group_messages_seen", onGroupMessagesSeen);
      socket.off("group_message_error", onGroupMessageError);
      socket.off("group_typing", onGroupTyping);
      socket.off("group_stop_typing", onGroupStopTyping);
      clearTypingTimers();
    };
  }, [currentUserId, selectedGroupId, dispatch, clearTypingTimers, clearTypingUsers]);

  const typingUsers =
    typingState.groupId === selectedGroupId
      ? typingState.users
      : new Map<string, string>();

  return { typingUsers };
}
