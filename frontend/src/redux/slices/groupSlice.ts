import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Group, GroupMessage } from "../../types/types";

interface GroupState {
  groups: Group[];
  selectedGroup: Group | null;
  groupMessages: GroupMessage[];
}

const initialState: GroupState = {
  groups: [],
  selectedGroup: null,
  groupMessages: [],
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
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.unshift(action.payload);
    },
    clearGroupChat: (state) => {
      state.selectedGroup = null;
      state.groupMessages = [];
      state.groups = [];
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
  addGroup,
  clearGroupChat,
} = groupSlice.actions;

export default groupSlice.reducer;