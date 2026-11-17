import { IGroupCallLog, CallType, GroupCallStatus } from "../../interfaces/IGroupCallLog";

export interface IGroupCallRepository {
  create(groupId: string, initiatorId: string, type: CallType): Promise<IGroupCallLog>;
  findById(callId: string): Promise<IGroupCallLog | null>;
  addParticipant(callId: string, userId: string): Promise<IGroupCallLog | null>;
  removeParticipant(callId: string, userId: string): Promise<IGroupCallLog | null>;
  markOngoing(callId: string): Promise<void>;
  finalize(
    callId: string,
    status: Exclude<GroupCallStatus, "ringing" | "ongoing">,
    endedAt: Date,
    duration: number
  ): Promise<IGroupCallLog | null>;
  getHistory(groupId: string): Promise<IGroupCallLog[]>;
}