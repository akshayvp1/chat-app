import { Document, Types } from "mongoose";

export type CallType = "audio" | "video";
export type CallStatus = "ongoing" | "completed" | "missed" | "rejected";

export interface ICallLog extends Document {
  callerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  type: CallType;
  status: CallStatus;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // seconds
}
