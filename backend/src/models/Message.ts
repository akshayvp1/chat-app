import mongoose, { Schema } from "mongoose";
import { IMessage } from "../interfaces/IMessage";

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
        // Call-log entries carry no text — only require it for real chat text.
        return this.type !== "call";
      },
      default: "",
    },
    type: { type: String, enum: ["text", "call"], default: "text" },
    call: { type: CallInfoSchema, required: false },
    seen: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("Message", MessageSchema);