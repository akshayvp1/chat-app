import { injectable, inject } from "tsyringe";
import { Model } from "mongoose";
import { IGroup } from "../interfaces/IGroup";
import { IGroupMessage, IGroupCallInfo } from "../interfaces/IGroupMessage";
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
    await this.groupModel.findByIdAndUpdate(groupId, { $addToSet: { members: userId } });
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.groupModel.findByIdAndUpdate(groupId, { $pull: { members: userId } });
  }

  /**
   * BUG FIX: this used to return the raw .create() result, whose senderId
   * was still a bare ObjectId — no name attached anywhere. That's why the
   * live socket message showed "?" while getGroupMessages (which does
   * .populate("senderId", "name email")) showed the real name on refresh.
   *
   * Now we populate senderId immediately after creating, and additionally
   * expose a flat `senderName` — this is the field socketHandler.ts already
   * reads as `saved.senderName`, so no changes are needed there.
   */
  async saveGroupMessage(groupId: string, senderId: string, text: string): Promise<IGroupMessage> {
    const created = await this.groupMessageModel.create({
      groupId,
      senderId,
      text,
      type: "text",
      seenBy: [senderId],
    });

    await created.populate("senderId", "name email");
    return this.withSenderName(created);
  }

  /**
   * Same fix applied here — group call log messages (e.g. "Missed group
   * call") were showing the same "?" problem for the same reason.
   */
  async saveGroupCallMessage(
    groupId: string,
    senderId: string,
    call: IGroupCallInfo
  ): Promise<IGroupMessage> {
    const created = await this.groupMessageModel.create({
      groupId,
      senderId,
      type: "call",
      call,
      seenBy: [senderId],
    });

    await created.populate("senderId", "name email");
    return this.withSenderName(created);
  }

  async getGroupMessages(groupId: string): Promise<IGroupMessage[]> {
    const messages = await this.groupMessageModel
      .find({ groupId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    // Attach the same flat senderName here too, so live messages and
    // messages loaded on refresh always have an identically-shaped
    // payload — no more "works after refresh, breaks live" divergence.
    return messages.map((m) => this.withSenderName(m));
  }

  async markGroupMessagesSeen(messageIds: string[], userId: string): Promise<void> {
    await this.groupMessageModel.updateMany(
      { _id: { $in: messageIds } },
      { $addToSet: { seenBy: userId } }
    );
  }

  /**
   * Pulls `.name` off the populated senderId doc and attaches it as a flat
   * `senderName` property, without disturbing the rest of the document's
   * shape (senderId stays populated, same as before this fix).
   */
  private withSenderName(message: IGroupMessage): IGroupMessage {
    const populatedSender = message.senderId as unknown as
      | { name?: string; email?: string; _id?: unknown }
      | undefined;

    (message as IGroupMessage & { senderName?: string }).senderName =
      populatedSender?.name ?? "Unknown";

    return message;
  }
}

export default GroupRepository;