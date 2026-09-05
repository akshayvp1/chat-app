import { injectable, inject } from "tsyringe";
import { IGroupService } from "./interface/IGroupService";
import { IGroupRepository } from "../repositories/interface/IGroupRepository";
import { IGroup } from "../interfaces/IGroup";
import { IGroupMessage } from "../interfaces/IGroupMessage";

@injectable()
class GroupService implements IGroupService {
  constructor(
    @inject("GroupRepository") private groupRepository: IGroupRepository
  ) {}

  async createGroup(name: string, description: string, adminId: string, memberIds: string[]): Promise<IGroup> {
    return await this.groupRepository.createGroup(name, description, adminId, memberIds);
  }

  async getGroupsForUser(userId: string): Promise<IGroup[]> {
    return await this.groupRepository.getGroupsForUser(userId);
  }

  async getGroupById(groupId: string): Promise<IGroup | null> {
    return await this.groupRepository.getGroupById(groupId);
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    await this.groupRepository.addMember(groupId, userId);
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.groupRepository.removeMember(groupId, userId);
  }

  async saveGroupMessage(groupId: string, senderId: string, text: string): Promise<IGroupMessage> {
    return await this.groupRepository.saveGroupMessage(groupId, senderId, text);
  }

  async getGroupMessages(groupId: string): Promise<IGroupMessage[]> {
    return await this.groupRepository.getGroupMessages(groupId);
  }

  async markGroupMessagesSeen(messageIds: string[], userId: string): Promise<void> {
    await this.groupRepository.markGroupMessagesSeen(messageIds, userId);
  }
}

export default GroupService;