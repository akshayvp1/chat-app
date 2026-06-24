import { inject, injectable } from "tsyringe";
import { IChatService } from "./interface/IChatService";
import { IChatRepository } from "../repositories/interface/IChatRepository";
import { IMessage } from "../interfaces/IMessage";

@injectable()
class ChatService implements IChatService {
  constructor(
    @inject("ChatRepository")
    private chatRepository: IChatRepository
  ) {}

  async saveMessage(senderId: string, receiverId: string, text: string): Promise<IMessage> {
    return await this.chatRepository.saveMessage(senderId, receiverId, text);
  }

  async getMessages(userA: string, userB: string): Promise<IMessage[]> {
    return await this.chatRepository.getMessages(userA, userB);
  }

  async markSeen(messageIds: string[]): Promise<void> {
    await this.chatRepository.markSeen(messageIds);
  }
}

export default ChatService;