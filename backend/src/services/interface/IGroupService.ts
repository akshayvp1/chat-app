import { IGroup } from "../../interfaces/IGroup";
import { IGroupMessage } from "../../interfaces/IGroupMessage";

export interface IGroupService {
  createGroup(name: string, description: string, adminId: string, memberIds: string[]): Promise<IGroup>;
  getGroupsForUser(userId: string): Promise<IGroup[]>;
  getGroupById(groupId: string): Promise<IGroup | null>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
  saveGroupMessage(groupId: string, senderId: string, text: string): Promise<IGroupMessage>;
  getGroupMessages(groupId: string): Promise<IGroupMessage[]>;
  markGroupMessagesSeen(messageIds: string[], userId: string): Promise<void>;
}