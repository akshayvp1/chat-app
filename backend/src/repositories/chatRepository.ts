import { injectable, inject } from "tsyringe";
import { Model } from "mongoose";
import { IMessage, ICallInfo } from "../interfaces/IMessage";
import { IChatRepository } from "../repositories/interface/IChatRepository";

@injectable()
class ChatRepository implements IChatRepository {
  constructor(
    @inject("Message")
    private messageModel: Model<IMessage>
  ) {}

  async saveMessage(senderId: string, receiverId: string, text: string): Promise<IMessage> {
    return await this.messageModel.create({ senderId, receiverId, text, type: "text" });
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
    return await this.messageModel
      .find({
        $or: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      })
      .sort({ createdAt: 1 });
  }

  async markSeen(messageIds: string[]): Promise<void> {
    await this.messageModel.updateMany(
      { _id: { $in: messageIds } },
      { seen: true }
    );
  }
}

export default ChatRepository;