import type { AttachmentResourceType } from "../../../types/types";

export const PROFILE_MAX_BYTES = 5 * 1024 * 1024;
export const MESSAGE_MAX_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export type UploadProgressCallback = (index: number, percent: number) => void;

export interface UploadTarget {
  receiverId?: string;
  groupId?: string;
}

export const MIME_TYPES: Record<AttachmentResourceType, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/aac",
  ],
  raw: [
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/rtf",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
  ],
};

export const PROFILE_ACCEPT = MIME_TYPES.image.join(",");
export const MESSAGE_ACCEPT = [
  ...MIME_TYPES.image,
  ...MIME_TYPES.video,
  ...MIME_TYPES.audio,
  ...MIME_TYPES.raw,
].join(",");

export const ATTACHMENT_ACCEPT = {
  document: MIME_TYPES.raw.join(","),
  media: [...MIME_TYPES.image, ...MIME_TYPES.video].join(","),
  audio: MIME_TYPES.audio.join(","),
} as const;

export type AttachmentCategory = keyof typeof ATTACHMENT_ACCEPT;
