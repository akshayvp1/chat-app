import { ICallLog, CallType, CallStatus } from "../../interfaces/ICallLog";

export interface ICallRepository {
  create(callerId: string, receiverId: string, type: CallType): Promise<ICallLog>;
  findById(id: string): Promise<ICallLog | null>;
  updateStatus(
    id: string,
    status: CallStatus,
    endedAt?: Date,
    duration?: number
  ): Promise<ICallLog | null>;
  getCallHistory(userId: string): Promise<ICallLog[]>;
}
