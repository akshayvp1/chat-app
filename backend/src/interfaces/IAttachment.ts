export type AttachmentResourceType = "image" | "video" | "audio" | "raw";

export interface IAttachment {
  url: string;
  publicId: string;
  resourceType: AttachmentResourceType;
  mimeType: string;
  fileName: string;
  size: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
}
