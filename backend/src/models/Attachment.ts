import { Schema } from "mongoose";
import { IAttachment } from "../interfaces/IAttachment";

export const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ["image", "video", "audio", "raw"],
      required: true,
    },
    mimeType: { type: String, required: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    format: { type: String, required: false },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    duration: { type: Number, required: false },
  },
  { _id: false }
);
