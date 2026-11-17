import mongoose, { Schema } from "mongoose";
import { IGroupMessage } from "../interfaces/IGroupMessage";

const GroupCallInfoSchema = new Schema(
  {
    callType: { type: String, enum: ["audio", "video"], required: true },
    status: { type: String, enum: ["completed", "missed"], required: true },
    duration: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const GroupMessageSchema = new Schema<IGroupMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: {
      type: String,
      required: function (this: IGroupMessage) {
        return this.type !== "call";
      },
      default: "",
    },
    type: { type: String, enum: ["text", "call"], default: "text" },
    call: { type: GroupCallInfoSchema, required: false },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  { timestamps: true }
);

export default mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);