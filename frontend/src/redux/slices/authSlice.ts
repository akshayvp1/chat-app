// authSlice.ts
// ─── CHANGED ─────────────────────────────────────────────────────────────────
// Only ONE addition: `setUser` reducer
// Everything else (storePendingUser, clearPendingUser, loginSuccess, logout)
// is 100% identical to your original — nothing broken, nothing renamed.
//
// setUser is called by App.tsx after GET /user/me succeeds on page load.
// It rehydrates Redux from the HttpOnly cookie without localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
    // ── NEW ── called by App.tsx on page load after /user/me succeeds
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    // ── UNCHANGED ────────────────────────────────────────────────────
    storePendingUser: (state, action: PayloadAction<User>) => {
      state.pendingUser = action.payload;
    },

    clearPendingUser: (state) => {
      state.pendingUser = null;
    },

    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
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
  setUser,
  storePendingUser,
  clearPendingUser,
  loginSuccess,
  logout,
} = authSlice.actions;

export default authSlice.reducer;