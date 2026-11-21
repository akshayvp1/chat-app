import { IGroup } from "../../interfaces/IGroup";
import { IGroupCallInfo, IGroupMessage } from "../../interfaces/IGroupMessage";
import { IAttachment } from "../../interfaces/IAttachment";

export interface IGroupService {
  createGroup(name: string, description: string, adminId: string, memberIds: string[]): Promise<IGroup>;
  getGroupsForUser(userId: string): Promise<IGroup[]>;
  getMemberGroupIds(userId: string, groupIds: string[]): Promise<string[]>;
  getGroupById(groupId: string): Promise<IGroup | null>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
  saveGroupMessage(
    groupId: string,
    senderId: string,
    text: string,
    attachments?: IAttachment[]
  ): Promise<IGroupMessage>;
  getGroupMessages(groupId: string): Promise<IGroupMessage[]>;
  countGroupMessages(groupId: string, messageIds: string[]): Promise<number>;
  markGroupMessagesSeen(
    messageIds: string[],
    userId: string,
    groupId?: string
  ): Promise<void>;
  getUnreadCounts(userId: string): Promise<Record<string, number>>;
  saveGroupCallMessage(
  groupId: string,
  senderId: string,
  call: IGroupCallInfo
): Promise<IGroupMessage>;
}