import mongoose, { Schema } from "mongoose";
import { IGroup } from "../interfaces/IGroup";

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>("Group", GroupSchema);