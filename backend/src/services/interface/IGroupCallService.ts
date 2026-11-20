import { IGroupCallLog, CallType, GroupCallStatus } from "../../interfaces/IGroupCallLog";

export interface IGroupCallService {
  startCall(groupId: string, initiatorId: string, type: CallType): Promise<IGroupCallLog>;
  joinCall(callId: string, userId: string): Promise<IGroupCallLog | null>;
  leaveCall(callId: string, userId: string): Promise<IGroupCallLog | null>;
  markOngoing(callId: string): Promise<void>;
  endCall(
    callId: string,
    status: Exclude<GroupCallStatus, "ringing" | "ongoing">
  ): Promise<IGroupCallLog | null>;
  getHistory(groupId: string): Promise<IGroupCallLog[]>;
}