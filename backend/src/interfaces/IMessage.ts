import { Document, Types } from "mongoose";

export type MessageType = "text" | "call";
export type CallLogStatus = "completed" | "missed" | "rejected";

export interface ICallInfo {
  callType: "audio" | "video";
  status: CallLogStatus;
  duration: number;
}

export interface IMessage extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  text: string;
  type: MessageType;
  call?: ICallInfo;
  seen: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}