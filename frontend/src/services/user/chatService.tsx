// ─── CHANGED ────────────────────────────────────────────────────────────────
// 1. No changes needed to logic — this file was already correct
// 2. Confirmed: no `any` types present
// 3. Tokens are in HttpOnly cookies — axiosInstance sends them automatically
//    via `withCredentials: true`; this service never touches tokens directly
// ─────────────────────────────────────────────────────────────────────────────

import axiosInstance from "../../utils/axiosInstance";
import type { UserList, ChatMessage } from "../../types/types";

const API_BASE_URL = "/user";

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const chatService = {
  async getUsers(): Promise<ServiceResponse<UserList[]>> {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/users-list`);
      return {
        success: true,
        data: response.data.users,
      };
    } catch {
      return {
        success: false,
        message: "Failed to fetch users",
      };
    }
  },

  async getMessages(receiverId: string): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const response = await axiosInstance.get(`/chat/messages/${receiverId}`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch {
      return {
        success: false,
        message: "Failed to fetch messages",
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await axiosInstance.post(`${API_BASE_URL}/logout`);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },
};

export default chatService;