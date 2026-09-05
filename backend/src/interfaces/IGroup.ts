import { Document, Types } from "mongoose";

export interface IGroup extends Document {
  name: string;
  description: string;
  admin: Types.ObjectId;
  members: Types.ObjectId[];
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}