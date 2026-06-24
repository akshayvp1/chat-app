import { IMessage } from "../../interfaces/IMessage";

export interface IChatRepository {
  saveMessage(senderId: string, receiverId: string, text: string): Promise<IMessage>;
  getMessages(userA: string, userB: string): Promise<IMessage[]>;
  markSeen(messageIds: string[]): Promise<void>;
}