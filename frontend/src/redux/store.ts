// store.ts
// ─── CHANGED ─────────────────────────────────────────────────────────────────
// Removed redux-persist entirely.
// Auth state is in-memory only. The cookie keeps the session alive across
// page reloads — a /auth/me call in App.tsx rehydrates Redux on every mount.
// No localStorage, no sessionStorage, no persistence library needed.
// ─────────────────────────────────────────────────────────────────────────────

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";

import groupReducer from "./slices/groupSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    group: groupReducer, // ← add this
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;