import { inject, injectable } from "tsyringe";
import { ICallService } from "../services/interface/ICallService";
import { ICallRepository } from "../repositories/interface/ICallRepository";
import { ICallLog, CallType, CallStatus } from "../interfaces/ICallLog";

@injectable()
export default class CallService implements ICallService {
  constructor(@inject("ICallRepository") private callRepository: ICallRepository) {}

  async startCall(callerId: string, receiverId: string, type: CallType): Promise<ICallLog> {
    return this.callRepository.create(callerId, receiverId, type);
  }

  async endCall(callId: string, status: Exclude<CallStatus, "ongoing">): Promise<ICallLog | null> {
    const call = await this.callRepository.findById(callId);
    if (!call) return null;

    const endedAt = new Date();
    const duration =
      status === "completed"
        ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
        : 0;

    return this.callRepository.updateStatus(callId, status, endedAt, duration);
  }

  async getHistory(userId: string): Promise<ICallLog[]> {
    return this.callRepository.getCallHistory(userId);
  }
}
