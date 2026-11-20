import { useEffect, useRef } from "react";

import { useAppDispatch } from "../redux/hooks";
import {
  clearContactUnread,
  setContactUnreadCount,
  setContacts,
  setMessages,
} from "../redux/slices/chatSlice";
import {
  setGroupUnreadCount,
  setGroups,
} from "../redux/slices/groupSlice";
import chatService from "../services/user/chatService";
import groupService from "../services/user/groupService";
import { socket } from "@/socket/socket";
import type { ChatMessage, UserList } from "../types/types";

interface UseChatDataLoaderParams {
  selectedContact: UserList | null;
  contacts: UserList[];
}

export function useChatDataLoader({
  selectedContact,
  contacts,
}: UseChatDataLoaderParams) {
  const dispatch = useAppDispatch();

  const selectedContactRef = useRef<UserList | null>(null);

  const selectedContactId = selectedContact?._id ?? null;

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    if (contacts.length > 0) return;

    async function fetchUsers() {
      const result = await chatService.getUsers();

      if (result.success && result.data) {
        dispatch(setContacts(result.data));
      }
    }

    fetchUsers();
  }, [dispatch, contacts.length]);

  useEffect(() => {
    async function fetchGroups() {
      const result = await groupService.getMyGroups();

      if (result.success && result.data) {
        dispatch(setGroups(result.data));
      }
    }

    fetchGroups();
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    async function fetchUnreadCounts() {
      const [contactResult, groupResult] = await Promise.all([
        chatService.getUnreadCounts(),
        groupService.getUnreadCounts(),
      ]);

      if (cancelled) return;

      if (contactResult.success && contactResult.data) {
        dispatch(setContactUnreadCount(contactResult.data));
      }

      if (groupResult.success && groupResult.data) {
        dispatch(setGroupUnreadCount(groupResult.data));
      }
    }

    fetchUnreadCounts();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const contactId = selectedContactId ?? "";
    if (!contactId) return;

    let cancelled = false;

    async function fetchMessages() {
      const res = await chatService.getMessages(contactId);

      if (cancelled || selectedContactRef.current?._id !== contactId) {
        return;
      }

      if (res.success && res.data) {
        const loaded: ChatMessage[] = res.data.map((m) => ({
          ...m,
          status: m.seen ? ("read" as const) : ("sent" as const),
        }));

        dispatch(setMessages(loaded));

        const unseenMessages = loaded.filter(
          (m) => m.senderId === contactId && !m.seen,
        );

        const unreadIds = unseenMessages.slice(0, 100).map((m) => m._id);

        if (unreadIds.length > 0) {
          socket.emit("mark_seen", {
            messageIds: unreadIds,
            senderId: contactId,
          });
        }

        if (unseenMessages.length > 100) {
          dispatch(
            setContactUnreadCount({
              [contactId]: unseenMessages.length - 100,
            }),
          );
        } else {
          dispatch(clearContactUnread(contactId));
        }
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedContactId, dispatch]);
}
