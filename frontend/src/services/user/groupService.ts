import axiosInstance from "../../utils/axiosInstance";
import type { Group, GroupMessage } from "../../types/types";

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const groupService = {
  async createGroup(name: string, description: string, memberIds: string[]): Promise<ServiceResponse<Group>> {
    try {
      const res = await axiosInstance.post("/group", { name, description, memberIds });
      return { success: true, data: res.data.data };
    } catch {
      return { success: false, message: "Failed to create group" };
    }
  },

  async getMyGroups(): Promise<ServiceResponse<Group[]>> {
    try {
      const res = await axiosInstance.get("/group/my-groups");
      return { success: true, data: res.data.data };
    } catch {
      return { success: false, message: "Failed to fetch groups" };
    }
  },

  async getGroupMessages(groupId: string): Promise<ServiceResponse<GroupMessage[]>> {
    try {
      const res = await axiosInstance.get(`/group/${groupId}/messages`);
      return { success: true, data: res.data.data };
    } catch {
      return { success: false, message: "Failed to fetch group messages" };
    }
  },

  async getUnreadCounts(): Promise<ServiceResponse<Record<string, number>>> {
    try {
      const res = await axiosInstance.get("/group/unread-counts");
      return { success: true, data: res.data.data };
    } catch {
      return { success: false, message: "Failed to fetch unread counts" };
    }
  },
};

export default groupService;