import { Document, Types } from "mongoose";

export interface IGroupMessage extends Document {
  groupId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  seenBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}