import { injectable } from "tsyringe";
import { ICallRepository } from "../repositories/interface/ICallRepository";
import { ICallLog, CallType, CallStatus } from "../interfaces/ICallLog";
import CallLog from "../models/callLogModel";

@injectable()
export default class CallRepository implements ICallRepository {
  async create(callerId: string, receiverId: string, type: CallType): Promise<ICallLog> {
    return CallLog.create({
      callerId,
      receiverId,
      type,
      status: "ongoing",
      startedAt: new Date(),
    });
  }

  async findById(id: string): Promise<ICallLog | null> {
    return CallLog.findById(id);
  }

  async updateStatus(
    id: string,
    status: CallStatus,
    endedAt?: Date,
    duration?: number
  ): Promise<ICallLog | null> {
    return CallLog.findByIdAndUpdate(
      id,
      {
        status,
        ...(endedAt && { endedAt }),
        ...(duration !== undefined && { duration }),
      },
      { new: true }
    );
  }

  async getCallHistory(userId: string): Promise<ICallLog[]> {
    return CallLog.find({ $or: [{ callerId: userId }, { receiverId: userId }] })
      .sort({ createdAt: -1 })
      .populate("callerId", "name profile")
      .populate("receiverId", "name profile");
  }
}
