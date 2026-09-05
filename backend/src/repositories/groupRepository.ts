import { injectable, inject } from "tsyringe";
import { Model, Types } from "mongoose";
import { IGroup } from "../interfaces/IGroup";
import { IGroupMessage } from "../interfaces/IGroupMessage";
import { IGroupRepository } from "./interface/IGroupRepository";

@injectable()
class GroupRepository implements IGroupRepository {
  constructor(
    @inject("Group") private groupModel: Model<IGroup>,
    @inject("GroupMessage") private groupMessageModel: Model<IGroupMessage>
  ) {}

  async createGroup(name: string, description: string, adminId: string, memberIds: string[]): Promise<IGroup> {
    const allMembers = [...new Set([adminId, ...memberIds])];
    return await this.groupModel.create({
      name,
      description,
      admin: adminId,
      members: allMembers,
    });
  }

  async getGroupById(groupId: string): Promise<IGroup | null> {
    return await this.groupModel.findById(groupId).populate("members", "name email");
  }

  async getGroupsForUser(userId: string): Promise<IGroup[]> {
    return await this.groupModel
      .find({ members: userId })
      .populate("members", "name email")
      .sort({ updatedAt: -1 });
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    await this.groupModel.findByIdAndUpdate(groupId, {
      $addToSet: { members: userId },
    });
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.groupModel.findByIdAndUpdate(groupId, {
      $pull: { members: userId },
    });
  }

  async saveGroupMessage(groupId: string, senderId: string, text: string): Promise<IGroupMessage> {
    return await this.groupMessageModel.create({ groupId, senderId, text, seenBy: [senderId] });
  }

  async getGroupMessages(groupId: string): Promise<IGroupMessage[]> {
    return await this.groupMessageModel
      .find({ groupId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });
  }

  async markGroupMessagesSeen(messageIds: string[], userId: string): Promise<void> {
    await this.groupMessageModel.updateMany(
      { _id: { $in: messageIds } },
      { $addToSet: { seenBy: userId } }
    );
  }
}

export default GroupRepository;