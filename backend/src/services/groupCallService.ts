import { inject, injectable } from "tsyringe";
import { IGroupCallService } from "./interface/IGroupCallService";
import { IGroupCallRepository } from "../repositories/interface/IGroupCallRepository";
import { IGroupCallLog, CallType, GroupCallStatus } from "../interfaces/IGroupCallLog";

@injectable()
export default class GroupCallService implements IGroupCallService {
  constructor(
    @inject("GroupCallRepository") private groupCallRepository: IGroupCallRepository
  ) {}

  async startCall(groupId: string, initiatorId: string, type: CallType): Promise<IGroupCallLog> {
    return this.groupCallRepository.create(groupId, initiatorId, type);
  }

  async joinCall(callId: string, userId: string): Promise<IGroupCallLog | null> {
    return this.groupCallRepository.addParticipant(callId, userId);
  }

  async leaveCall(callId: string, userId: string): Promise<IGroupCallLog | null> {
    return this.groupCallRepository.removeParticipant(callId, userId);
  }

  async markOngoing(callId: string): Promise<void> {
    await this.groupCallRepository.markOngoing(callId);
  }

  async endCall(
    callId: string,
    status: Exclude<GroupCallStatus, "ringing" | "ongoing">
  ): Promise<IGroupCallLog | null> {
    const call = await this.groupCallRepository.findById(callId);
    if (!call) return null;

    const endedAt = new Date();
    const base = call.connectedAt ?? call.startedAt;
    const duration =
      status === "completed"
        ? Math.max(0, Math.round((endedAt.getTime() - base.getTime()) / 1000))
        : 0;

    return this.groupCallRepository.finalize(callId, status, endedAt, duration);
  }

  async getHistory(groupId: string): Promise<IGroupCallLog[]> {
    return this.groupCallRepository.getHistory(groupId);
  }
}