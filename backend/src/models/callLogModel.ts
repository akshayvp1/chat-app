import { Schema, model } from "mongoose";
import { ICallLog } from "../interfaces/ICallLog";

const callLogSchema = new Schema<ICallLog>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ongoing", "completed", "missed", "rejected"],
      default: "ongoing",
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model<ICallLog>("CallLog", callLogSchema);