import type { AttachmentResourceType } from "../../../types/types";
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_MAX_BYTES,
  MIME_TYPES,
  PROFILE_MAX_BYTES,
} from "./constants";

function getResourceType(mimeType: string): AttachmentResourceType | null {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();

  for (const resourceType of Object.keys(MIME_TYPES) as AttachmentResourceType[]) {
    if (MIME_TYPES[resourceType].includes(normalized)) {
      return resourceType;
    }
  }

  return null;
}

export function validateProfileImage(file: File): string | null {
  if (getResourceType(file.type) !== "image") {
    return "Profile pictures must be a JPG, PNG, GIF, WebP, or AVIF image.";
  }

  if (file.size > PROFILE_MAX_BYTES) {
    return "Profile pictures must be 5MB or smaller.";
  }

  return null;
}

export function validateMessageFile(file: File): string | null {
  if (!getResourceType(file.type)) {
    return `${file.name}: unsupported file type.`;
  }

  if (file.size > MESSAGE_MAX_BYTES) {
    return `${file.name}: files must be 25MB or smaller.`;
  }

  return null;
}

export function validateMessageFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Choose at least one file to upload.";
  }

  if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`;
  }

  for (const file of files) {
    const error = validateMessageFile(file);
    if (error) return error;
  }

  return null;
}
