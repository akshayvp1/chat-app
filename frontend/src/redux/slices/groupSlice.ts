import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Group, GroupMessage } from "../../types/types";

interface GroupState {
  groups: Group[];
  selectedGroup: Group | null;
  groupMessages: GroupMessage[];
  unreadByGroup: Record<string, number>;
}

const initialState: GroupState = {
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  unreadByGroup: {},
};

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload;
    },
    setSelectedGroup: (state, action: PayloadAction<Group | null>) => {
      state.selectedGroup = action.payload;
    },
    setGroupMessages: (state, action: PayloadAction<GroupMessage[]>) => {
      state.groupMessages = action.payload;
    },
    addGroupMessage: (state, action: PayloadAction<GroupMessage>) => {
      state.groupMessages.push(action.payload);
    },
    replaceGroupMessage: (state, action: PayloadAction<GroupMessage>) => {
      const index = state.groupMessages.findIndex(
        (m) => m.tempId !== undefined && m.tempId === action.payload.tempId
      );
      if (index !== -1) state.groupMessages[index] = action.payload;
    },
    markGroupMessageError: (state, action: PayloadAction<string>) => {
      const index = state.groupMessages.findIndex((m) => m.tempId === action.payload);
      if (index !== -1) state.groupMessages[index] = { ...state.groupMessages[index], status: "error" };
    },
    markGroupMessagesSeen: (state, action: PayloadAction<string[]>) => {
      state.groupMessages = state.groupMessages.map((m) =>
        action.payload.includes(m._id) ? { ...m, status: "read" } : m
      );
    },

    markGroupMessageDelivered: (
      state,
      action: PayloadAction<{ messageId: string; tempId?: string }>
    ) => {
      state.groupMessages = state.groupMessages.map((message) => {
        const matches =
          message._id === action.payload.messageId ||
          (!!action.payload.tempId && message.tempId === action.payload.tempId);
        return matches && message.status === "sent"
          ? { ...message, status: "delivered" }
          : message;
      });
    },
    incrementGroupUnread: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      state.unreadByGroup[groupId] = (state.unreadByGroup[groupId] ?? 0) + 1;
    },
    setGroupUnreadCount: (
      state,
      action: PayloadAction<Record<string, number>>
    ) => {
      Object.entries(action.payload).forEach(([groupId, count]) => {
        state.unreadByGroup[groupId] = Math.max(
          state.unreadByGroup[groupId] ?? 0,
          count
        );
      });
    },
    clearGroupUnread: (state, action: PayloadAction<string>) => {
      delete state.unreadByGroup[action.payload];
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.unshift(action.payload);
    },
    clearGroupChat: (state) => {
      state.selectedGroup = null;
      state.groupMessages = [];
      state.groups = [];
      state.unreadByGroup = {};
    },
  },
});

export const {
  setGroups,
  setSelectedGroup,
  setGroupMessages,
  addGroupMessage,
  replaceGroupMessage,
  markGroupMessageError,
  markGroupMessagesSeen,
  markGroupMessageDelivered,
  incrementGroupUnread,
  setGroupUnreadCount,
  clearGroupUnread,
  addGroup,
  clearGroupChat,
} = groupSlice.actions;

export default groupSlice.reducer;