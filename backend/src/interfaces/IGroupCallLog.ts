import { Document, Types } from "mongoose";

export type CallType = "audio" | "video";
export type GroupCallStatus = "ringing" | "ongoing" | "completed" | "missed";

export interface IParticipantEntry {
  userId: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
}

export interface IGroupCallLog extends Document {
  groupId: Types.ObjectId;
  initiatorId: Types.ObjectId;
  type: CallType;
  status: GroupCallStatus;
  participants: IParticipantEntry[];
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration: number;
}