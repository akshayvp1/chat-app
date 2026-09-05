import mongoose, { Schema } from "mongoose";
import { ICallLog } from "../interfaces/ICallLog";

const CallLogSchema = new Schema<ICallLog>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ongoing", "completed", "missed", "rejected"],
      default: "ongoing",
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<ICallLog>("CallLog", CallLogSchema);
