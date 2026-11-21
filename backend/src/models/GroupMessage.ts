import mongoose, { Schema } from "mongoose";
import { IGroupMessage } from "../interfaces/IGroupMessage";
import { AttachmentSchema } from "./Attachment";

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
        return this.type !== "call" && !(this.attachments && this.attachments.length > 0);
      },
      default: "",
    },
    type: { type: String, enum: ["text", "call"], default: "text" },
    call: { type: GroupCallInfoSchema, required: false },
    attachments: { type: [AttachmentSchema], default: [] },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  { timestamps: true }
);

GroupMessageSchema.index({ groupId: 1, createdAt: -1 });
GroupMessageSchema.index({ groupId: 1, seenBy: 1 });

export default mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);