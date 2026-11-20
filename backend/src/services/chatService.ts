import { inject, injectable } from "tsyringe";
import { IChatService } from "./interface/IChatService";
import { IChatRepository } from "../repositories/interface/IChatRepository";
import { IMessage, ICallInfo } from "../interfaces/IMessage";
import { IAttachment } from "../interfaces/IAttachment";

@injectable()
class ChatService implements IChatService {
  constructor(
    @inject("ChatRepository")
    private chatRepository: IChatRepository
  ) {}

  async saveMessage(
    senderId: string,
    receiverId: string,
    text: string,
    attachments?: IAttachment[]
  ): Promise<IMessage> {
    return await this.chatRepository.saveMessage(senderId, receiverId, text, attachments);
  }

  async saveCallMessage(senderId: string, receiverId: string, call: ICallInfo): Promise<IMessage> {
    return await this.chatRepository.saveCallMessage(senderId, receiverId, call);
  }

  async getMessages(userA: string, userB: string): Promise<IMessage[]> {
    return await this.chatRepository.getMessages(userA, userB);
  }

  async markSeen(messageIds: string[]): Promise<void> {
    await this.chatRepository.markSeen(messageIds);
  }

  async getUnreadCounts(receiverId: string): Promise<Record<string, number>> {
    return await this.chatRepository.getUnreadCounts(receiverId);
  }
}

export default ChatService;