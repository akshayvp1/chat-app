import mongoose, { Schema } from "mongoose";
import { IMessage } from "../interfaces/IMessage";
import { AttachmentSchema } from "./Attachment";

const CallInfoSchema = new Schema(
  {
    callType: { type: String, enum: ["audio", "video"], required: true },
    status: { type: String, enum: ["completed", "missed", "rejected"], required: true },
    duration: { type: Number, default: 0 },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: {
      type: String,
      required: function (this: IMessage) {
        return this.type !== "call" && !(this.attachments && this.attachments.length > 0);
      },
      default: "",
    },
    type: { type: String, enum: ["text", "call"], default: "text" },
    call: { type: CallInfoSchema, required: false },
    attachments: { type: [AttachmentSchema], default: [] },
    seen: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, seen: 1, type: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);