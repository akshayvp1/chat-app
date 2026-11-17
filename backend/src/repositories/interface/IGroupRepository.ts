import { IGroup } from "../../interfaces/IGroup";
import { IGroupMessage, IGroupCallInfo } from "../../interfaces/IGroupMessage";

export interface IGroupRepository {
  createGroup(
    name: string,
    description: string,
    adminId: string,
    memberIds: string[]
  ): Promise<IGroup>;

  getGroupsForUser(userId: string): Promise<IGroup[]>;
  getGroupById(groupId: string): Promise<IGroup | null>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;

  saveGroupMessage(groupId: string, senderId: string, text: string): Promise<IGroupMessage>;

  saveGroupCallMessage(
    groupId: string,
    senderId: string,
    call: IGroupCallInfo
  ): Promise<IGroupMessage>;

  getGroupMessages(groupId: string): Promise<IGroupMessage[]>;
  markGroupMessagesSeen(messageIds: string[], userId: string): Promise<void>;
}