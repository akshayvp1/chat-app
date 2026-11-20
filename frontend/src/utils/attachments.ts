import { createTempId } from "./validation";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
}

export function createPendingAttachment(file: File): PendingAttachment {
  const isPreviewable =
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/");

  const previewUrl = isPreviewable ? URL.createObjectURL(file) : null;

  return {
    id: createTempId("file"),
    file,
    previewUrl,
  };
}

export function revokePendingAttachment(attachment: PendingAttachment): void {
  if (attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

export function revokePendingAttachments(attachments: PendingAttachment[]): void {
  attachments.forEach(revokePendingAttachment);
}
