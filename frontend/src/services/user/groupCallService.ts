import axiosInstance from "../../utils/axiosInstance";

const API_BASE_URL = "/group-call";

export type GroupCallType = "audio" | "video";
export type GroupCallLogStatus = "ringing" | "ongoing" | "completed" | "missed";

export interface GroupCallParticipant {
  userId: { _id: string; name: string; profile?: string } | string;
  joinedAt: string;
  leftAt?: string;
}

export interface GroupCallLogEntry {
  _id: string;
  groupId: string;
  initiatorId: { _id: string; name: string; profile?: string } | string;
  type: GroupCallType;
  status: GroupCallLogStatus;
  participants: GroupCallParticipant[];
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  duration?: number;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const groupCallService = {
  async getHistory(groupId: string): Promise<ServiceResponse<GroupCallLogEntry[]>> {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/history/${groupId}`);
      const raw = response.data;

      if (Array.isArray(raw)) {
        return { success: true, data: raw };
      }
      return { success: raw?.success ?? true, data: raw?.data ?? [] };
    } catch (error) {
      console.error("getGroupCallHistory error:", error);
      return { success: false, message: "Failed to fetch group call history" };
    }
  },
};

export default groupCallService;