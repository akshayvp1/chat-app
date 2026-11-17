import { IMessage, ICallInfo } from "../../interfaces/IMessage";

export interface IChatService {
  saveMessage(senderId: string, receiverId: string, text: string): Promise<IMessage>;
  saveCallMessage(senderId: string, receiverId: string, call: ICallInfo): Promise<IMessage>;
  getMessages(userA: string, userB: string): Promise<IMessage[]>;
  markSeen(messageIds: string[]): Promise<void>;
}