import { useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch } from "../redux/hooks";
import {
  addMessage,
  incrementContactUnread,
  markMessageDelivered,
  markMessageError,
  markMessagesSeen,
  replaceMessage,
} from "../redux/slices/chatSlice";
import { incrementGroupUnread } from "../redux/slices/groupSlice";
import { connectSocket, socket } from "@/socket/socket";
import type {
  ChatMessage,
  Group,
  GroupMessage,
  UserList,
} from "../types/types";
import {
  notifyIncomingMessage,
  type MessageNotificationPreferences,
} from "../utils/messageNotifications";
import { useChatDataLoader } from "./useChatDataLoader";
import { useChatPresence } from "./useChatPresence";

interface UseDirectChatSocketParams {
  currentUserId: string;
  selectedContact: UserList | null;
  selectedGroupId: string | null;
  contacts: UserList[];
  groups: Group[];
  notificationPrefs: MessageNotificationPreferences;
  callActive: boolean;
}

export function useDirectChatSocket({
  currentUserId,
  selectedContact,
  selectedGroupId,
  contacts,
  groups,
  notificationPrefs,
  callActive,
}: UseDirectChatSocketParams) {
  const dispatch = useAppDispatch();
  const {
    onlineUsers,
    requestOnlineUsers,
    onUserStatus,
    onOnlineUsers,
    clearOnlineUsers,
  } = useChatPresence();

  useChatDataLoader({ selectedContact, contacts });

  const [isTyping, setIsTyping] = useState(false);

  const selectedContactRef = useRef<UserList | null>(null);
  const selectedGroupIdRef = useRef<string | null>(null);
  const contactsRef = useRef(contacts);
  const groupsRef = useRef(groups);
  const notificationPrefsRef = useRef(notificationPrefs);
  const callActiveRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenQueueRef = useRef<Map<string, Set<string>>>(new Map());
  const seenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTypingTimer = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const flushPendingSeen = useCallback(() => {
    seenFlushTimerRef.current = null;

    for (const [senderId, messageIds] of seenQueueRef.current) {
      const queuedIds = [...messageIds].slice(0, 100);
      if (queuedIds.length > 0) {
        socket.emit("mark_seen", { messageIds: queuedIds, senderId });
      }
    }

    seenQueueRef.current.clear();
  }, []);

  const queueSeen = useCallback(
    (senderId: string, messageId: string) => {
      let queuedIds = seenQueueRef.current.get(senderId);
      if (!queuedIds) {
        queuedIds = new Set<string>();
        seenQueueRef.current.set(senderId, queuedIds);
      }
      queuedIds.add(messageId);

      if (!seenFlushTimerRef.current) {
        seenFlushTimerRef.current = setTimeout(flushPendingSeen, 300);
      }
    },
    [flushPendingSeen],
  );

  useEffect(
    () => () => {
      if (seenFlushTimerRef.current) {
        clearTimeout(seenFlushTimerRef.current);
        seenFlushTimerRef.current = null;
      }
      seenQueueRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    selectedContactRef.current = selectedContact;
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedContact, selectedGroupId]);

  useEffect(() => {
    contactsRef.current = contacts;
    groupsRef.current = groups;
    notificationPrefsRef.current = notificationPrefs;
    callActiveRef.current = callActive;
  }, [contacts, groups, notificationPrefs, callActive]);

  useEffect(() => {
    if (!currentUserId) return;

    connectSocket(currentUserId);

    function onConnect() {
      requestOnlineUsers();
    }

    function onDisconnect() {
      clearOnlineUsers();
      clearTypingTimer();
      setIsTyping(false);
    }

    function onMessageSent(payload: ChatMessage) {
      dispatch(replaceMessage({ ...payload, status: "sent" }));
    }

    function onMessageDelivered(payload: { messageId: string; tempId?: string }) {
      dispatch(markMessageDelivered(payload));
    }

    function onReceiveMessage(payload: ChatMessage) {
      const contact = selectedContactRef.current;

      const belongsToOpenThread =
        !!contact &&
        (payload.senderId === contact._id ||
          payload.receiverId === contact._id);

      if (belongsToOpenThread) {
        dispatch(
          addMessage({
            ...payload,
            status: "delivered",
          }),
        );
      } else if (payload.senderId !== currentUserId) {
        dispatch(incrementContactUnread(payload.senderId));

        if (payload.type !== "call" && !callActiveRef.current) {
          const senderName =
            contactsRef.current.find((c) => c._id === payload.senderId)
              ?.name ?? "New message";

          notifyIncomingMessage(
            notificationPrefsRef.current,
            senderName,
            payload.text || "New message",
            `direct:${payload.senderId}`,
          );
        }
      }

      if (contact && payload.senderId === contact._id) {
        queueSeen(payload.senderId, payload._id);
      }
    }

    function onReceiveGroupMessage(payload: GroupMessage) {
      if (
        selectedGroupIdRef.current === payload.groupId ||
        payload.senderId === currentUserId
      ) {
        return;
      }

      dispatch(incrementGroupUnread(payload.groupId));

      if (payload.type !== "call" && !callActiveRef.current) {
        const groupName =
          groupsRef.current.find((g) => g._id === payload.groupId)?.name ??
          "Group message";

        notifyIncomingMessage(
          notificationPrefsRef.current,
          groupName,
          `${payload.senderName || "Someone"}: ${
            payload.text || "New message"
          }`,
          `group:${payload.groupId}`,
        );
      }
    }

    function onMessagesSeen({ messageIds }: { messageIds: string[] }) {
      dispatch(markMessagesSeen(messageIds));
    }

    function onTyping({ from }: { from: string }) {
      if (from === currentUserId || selectedContactRef.current?._id !== from) {
        return;
      }

      setIsTyping(true);
      clearTypingTimer();
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
    }

    function onStopTyping({ from }: { from: string }) {
      if (from === currentUserId || selectedContactRef.current?._id !== from) {
        return;
      }

      clearTypingTimer();
      setIsTyping(false);
    }

    function onMessageError({ tempId }: { tempId: string }) {
      dispatch(markMessageError(tempId));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message_sent", onMessageSent);
    socket.on("message_delivered", onMessageDelivered);
    socket.on("receive_message", onReceiveMessage);
    socket.on("receive_group_message", onReceiveGroupMessage);
    socket.on("messages_seen", onMessagesSeen);
    socket.on("user_status", onUserStatus);
    socket.on("online_users", onOnlineUsers);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("message_error", onMessageError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message_sent", onMessageSent);
      socket.off("message_delivered", onMessageDelivered);
      socket.off("receive_message", onReceiveMessage);
      socket.off("receive_group_message", onReceiveGroupMessage);
      socket.off("messages_seen", onMessagesSeen);
      socket.off("user_status", onUserStatus);
      socket.off("online_users", onOnlineUsers);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("message_error", onMessageError);
      clearTypingTimer();
    };
  }, [
    currentUserId,
    dispatch,
    clearOnlineUsers,
    clearTypingTimer,
    onOnlineUsers,
    onUserStatus,
    queueSeen,
    requestOnlineUsers,
  ]);

  function clearTypingIndicator() {
    setIsTyping(false);
  }

  return { onlineUsers, isTyping, clearTypingIndicator };
}
