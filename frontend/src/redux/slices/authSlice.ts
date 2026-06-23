import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { User } from "../../types/types";

interface AuthState {
  user: User | null;
  pendingUser: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  pendingUser: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    storePendingUser: (
      state,
      action: PayloadAction<User>
    ) => {
      state.pendingUser =
        action.payload;
    },

    clearPendingUser: (state) => {
      state.pendingUser = null;
    },

    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
      }>
    ) => {
      state.user = action.payload.user;
      
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.user = null;
      state.pendingUser = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  storePendingUser,
  clearPendingUser,
  loginSuccess,
  logout,
} = authSlice.actions;

export default authSlice.reducer;