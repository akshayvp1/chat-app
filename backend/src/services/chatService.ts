import { inject, injectable } from "tsyringe";
import { IChatService } from "./interface/IChatService";
import { IChatRepository } from "../repositories/interface/IChatRepository";
import { IMessage, ICallInfo } from "../interfaces/IMessage";

@injectable()
class ChatService implements IChatService {
  constructor(
    @inject("ChatRepository")
    private chatRepository: IChatRepository
  ) {}

  async saveMessage(senderId: string, receiverId: string, text: string): Promise<IMessage> {
    return await this.chatRepository.saveMessage(senderId, receiverId, text);
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
}

export default ChatService;