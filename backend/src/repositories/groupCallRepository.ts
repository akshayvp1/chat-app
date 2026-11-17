import { injectable, inject } from "tsyringe";
import { Model } from "mongoose";
import { IGroupCallLog, CallType, GroupCallStatus } from "../interfaces/IGroupCallLog";
import { IGroupCallRepository } from "./interface/IGroupCallRepository";

@injectable()
export default class GroupCallRepository implements IGroupCallRepository {
  constructor(
    @inject("GroupCallLog") private groupCallLogModel: Model<IGroupCallLog>
  ) {}

  async create(groupId: string, initiatorId: string, type: CallType): Promise<IGroupCallLog> {
    // Array-form create() forces Mongoose's TS overload to return a single
    // hydrated document rather than an array type.
    const [call] = await this.groupCallLogModel.create([
      {
        groupId,
        initiatorId,
        type,
        status: "ringing",
        startedAt: new Date(),
        participants: [{ userId: initiatorId, joinedAt: new Date() }],
      },
    ]);
    return call;
  }

  async findById(callId: string): Promise<IGroupCallLog | null> {
    return this.groupCallLogModel.findById(callId);
  }

  async addParticipant(callId: string, userId: string): Promise<IGroupCallLog | null> {
    return this.groupCallLogModel.findByIdAndUpdate(
      callId,
      { $push: { participants: { userId, joinedAt: new Date() } } },
      { new: true }
    );
  }

  async removeParticipant(callId: string, userId: string): Promise<IGroupCallLog | null> {
    const call = await this.groupCallLogModel.findById(callId);
    if (!call) return null;

    for (let i = call.participants.length - 1; i >= 0; i--) {
      const entry = call.participants[i];
      if (String(entry.userId) === userId && !entry.leftAt) {
        call.set(`participants.${i}.leftAt`, new Date());
        break;
      }
    }

    await call.save();
    return call;
  }

  async markOngoing(callId: string): Promise<void> {
    await this.groupCallLogModel.updateOne(
      { _id: callId, status: "ringing" },
      { status: "ongoing", connectedAt: new Date() }
    );
  }

  async finalize(
    callId: string,
    status: Exclude<GroupCallStatus, "ringing" | "ongoing">,
    endedAt: Date,
    duration: number
  ): Promise<IGroupCallLog | null> {
    return this.groupCallLogModel.findByIdAndUpdate(
      callId,
      { status, endedAt, duration },
      { new: true }
    );
  }

  async getHistory(groupId: string): Promise<IGroupCallLog[]> {
    return this.groupCallLogModel
      .find({ groupId, status: { $in: ["completed", "missed"] } })
      .populate("initiatorId", "name")
      .sort({ startedAt: -1 });
  }
}