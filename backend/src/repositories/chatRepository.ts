import { injectable, inject } from "tsyringe";
import { Model } from "mongoose";
import { IMessage, ICallInfo } from "../interfaces/IMessage";
import { IAttachment } from "../interfaces/IAttachment";
import { IChatRepository } from "../repositories/interface/IChatRepository";

@injectable()
class ChatRepository implements IChatRepository {
  constructor(
    @inject("Message")
    private messageModel: Model<IMessage>
  ) {}

  async saveMessage(
    senderId: string,
    receiverId: string,
    text: string,
    attachments?: IAttachment[]
  ): Promise<IMessage> {
    return await this.messageModel.create({
      senderId,
      receiverId,
      text,
      type: "text",
      attachments: attachments ?? [],
    });
  }

  async saveCallMessage(senderId: string, receiverId: string, call: ICallInfo): Promise<IMessage> {
    return await this.messageModel.create({
      senderId,
      receiverId,
      type: "call",
      call,
    });
  }

  async getMessages(userA: string, userB: string): Promise<IMessage[]> {
    const messages = await this.messageModel
      .find({
        $or: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(200);

    return messages.reverse();
  }

  async countMessagesForReceiver(
    senderId: string,
    receiverId: string,
    messageIds: string[]
  ): Promise<number> {
    return await this.messageModel.countDocuments({
      _id: { $in: messageIds },
      senderId,
      receiverId,
    });
  }

  async markSeen(messageIds: string[]): Promise<void> {
    await this.messageModel.updateMany(
      { _id: { $in: messageIds } },
      { seen: true }
    );
  }

  async markSeenForReceiver(
    messageIds: string[],
    receiverId: string
  ): Promise<void> {
    await this.messageModel.updateMany(
      { _id: { $in: messageIds }, receiverId },
      { seen: true }
    );
  }

  async getUnreadCounts(receiverId: string): Promise<Record<string, number>> {
    const messages = await this.messageModel
      .find({ receiverId, seen: false, type: { $ne: "call" } })
      .select("senderId");

    const counts: Record<string, number> = {};
    for (const message of messages) {
      const senderId = String(message.senderId);
      counts[senderId] = (counts[senderId] ?? 0) + 1;
    }
    return counts;
  }
}

export default ChatRepository;