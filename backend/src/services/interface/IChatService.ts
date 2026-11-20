import { IMessage, ICallInfo } from "../../interfaces/IMessage";
import { IAttachment } from "../../interfaces/IAttachment";

export interface IChatService {
  saveMessage(
    senderId: string,
    receiverId: string,
    text: string,
    attachments?: IAttachment[]
  ): Promise<IMessage>;
  saveCallMessage(senderId: string, receiverId: string, call: ICallInfo): Promise<IMessage>;
  getMessages(userA: string, userB: string): Promise<IMessage[]>;
  markSeen(messageIds: string[]): Promise<void>;
  getUnreadCounts(receiverId: string): Promise<Record<string, number>>;
}