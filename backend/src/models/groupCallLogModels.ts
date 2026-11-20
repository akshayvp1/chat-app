import { Schema, model } from "mongoose";
import { IGroupCallLog } from "../interfaces/IGroupCallLog";

const ParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date },
  },
  { _id: false }
);

const GroupCallLogSchema = new Schema<IGroupCallLog>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    initiatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "ongoing", "completed", "missed"],
      default: "ringing",
    },
    participants: { type: [ParticipantSchema], default: [] },
    startedAt: { type: Date, required: true },
    connectedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model<IGroupCallLog>("GroupCallLog", GroupCallLogSchema);