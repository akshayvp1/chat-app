import axiosInstance from "../../utils/axiosInstance";

const API_BASE_URL = "/call";

export type CallType = "audio" | "video";
export type CallLogStatus = "ongoing" | "completed" | "missed" | "rejected";

export interface CallLogEntry {
  _id: string;
  callerId: { _id: string; name: string; profile?: string } | string;
  receiverId: { _id: string; name: string; profile?: string } | string;
  type: CallType;
  status: CallLogStatus;
  startedAt: string;
  endedAt?: string;
  duration?: number;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const callService = {
  async getHistory(): Promise<ServiceResponse<CallLogEntry[]>> {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/history`);
      const raw = response.data;

      if (Array.isArray(raw)) {
        return { success: true, data: raw };
      }
      return { success: raw?.success ?? true, data: raw?.data ?? [] };
    } catch (error) {
      console.error("getHistory error:", error);
      return { success: false, message: "Failed to fetch call history" };
    }
  },
};

export default callService;