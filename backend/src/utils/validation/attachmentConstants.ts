import { AttachmentResourceType } from "../../interfaces/IAttachment";

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

export const MAX_ATTACHMENT_COUNT = 5;
export const LEGACY_CLOUDINARY_HOSTS = new Set(["res.cloudinary.com", "api.cloudinary.com"]);
export const CONTENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;
export const STORED_FILE_PATH_PATTERN =
  /^\/api\/uploads\/(profiles|messages)\/[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.[A-Za-z0-9]{1,10}$/i;

export const ALLOWED_MIME_TYPES: Record<AttachmentResourceType, readonly string[]> = {
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

export const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/rtf": "rtf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.presentation": "odp",
};

export function normalizeMimeType(value: unknown): AttachmentResourceType | null {
  if (typeof value !== "string") return null;
  const mimeType = value.toLowerCase().split(";")[0].trim();

  for (const resourceType of Object.keys(ALLOWED_MIME_TYPES) as AttachmentResourceType[]) {
    if (ALLOWED_MIME_TYPES[resourceType].includes(mimeType)) return resourceType;
  }

  return null;
}
