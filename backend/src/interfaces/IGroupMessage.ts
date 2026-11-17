import { Document, Types } from "mongoose";

export interface IGroupCallInfo {
  callType: "audio" | "video";
  status: "completed" | "missed";
  duration: number;
  participantCount: number;
}

export interface IGroupMessage extends Document {
  groupId: Types.ObjectId;
  senderId: Types.ObjectId;

  /**
   * NOT stored in the schema. Populated on the way out of the DB by
   * the repository (via `.populate("senderId", "name")`) and attached
   * before the document is returned. Keep it optional here since a
   * freshly-created, un-populated Mongoose doc won't have it.
   */
  senderName?: string;

  text: string;
  type: "text" | "call";
  call?: IGroupCallInfo;
  seenBy: Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}