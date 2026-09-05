import { ICallLog, CallType, CallStatus } from "./ICallLog";

export interface ICallService {
  startCall(callerId: string, receiverId: string, type: CallType): Promise<ICallLog>;
  endCall(callId: string, status: Exclude<CallStatus, "ongoing">): Promise<ICallLog | null>;
  getHistory(userId: string): Promise<ICallLog[]>;
}
