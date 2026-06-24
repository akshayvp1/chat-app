import { Types } from "mongoose";

export interface IMessage {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  text: string;
  seen: boolean;
  createdAt: Date;
  updatedAt: Date;
}