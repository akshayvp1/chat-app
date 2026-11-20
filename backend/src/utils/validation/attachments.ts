import path from "path";
import { AttachmentResourceType, IAttachment } from "../../interfaces/IAttachment";
import { RequestError } from "./errors";
import { boundedString, requireRecord } from "./fields";
import {
  CONTENT_TYPE_PATTERN,
  FILE_EXTENSIONS,
  LEGACY_CLOUDINARY_HOSTS,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SIZE,
  STORED_FILE_PATH_PATTERN,
  normalizeMimeType,
} from "./attachmentConstants";

export function resolveAttachmentResourceType(
  mimeTypeValue: unknown,
  intent?: "message" | "profile"
): AttachmentResourceType {
  const resourceType = normalizeMimeType(mimeTypeValue);

  if (!resourceType) {
    throw new RequestError("Unsupported file type");
  }

  if (intent === "profile" && resourceType !== "image") {
    throw new RequestError("Only image files are allowed for profile uploads");
  }

  return resourceType;
}

export function getFileExtension(mimeTypeValue: unknown): string {
  const mimeType = typeof mimeTypeValue === "string"
    ? mimeTypeValue.toLowerCase().split(";")[0].trim()
    : "";
  const extension = FILE_EXTENSIONS[mimeType];

  if (!extension) {
    throw new RequestError("Unsupported file type");
  }

  return extension;
}

export function sanitizeFileName(value: unknown): string {
  const base = typeof value === "string" ? path.basename(value) : "";
  return (
    base
      .replace(/[\\/]/g, "_")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 200) || "file"
  );
}

export function isStoredFilePath(value: unknown): value is string {
  return typeof value === "string" && STORED_FILE_PATH_PATTERN.test(value);
}

export function normalizeStoredFileUrl(value: unknown, field = "URL"): string {
  const raw = boundedString(value, field, 1, 2048);

  if (isStoredFilePath(raw)) {
    return raw;
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new RequestError(`${field} must be a valid file URL`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RequestError(`${field} must use http or https`);
  }

  if (url.username || url.password) {
    throw new RequestError(`${field} is invalid`);
  }

  if (STORED_FILE_PATH_PATTERN.test(url.pathname)) {
    return raw;
  }

  if (url.protocol === "https:" && LEGACY_CLOUDINARY_HOSTS.has(url.hostname.toLowerCase())) {
    return raw;
  }

  throw new RequestError(`${field} must be a valid uploaded file URL`);
}

export function normalizeContentType(value: unknown, field = "Content type"): string {
  const contentType = boundedString(value, field, 1, 255).toLowerCase();
  if (!CONTENT_TYPE_PATTERN.test(contentType)) {
    throw new RequestError(`Invalid ${field.toLowerCase()}`);
  }
  return contentType;
}

export function normalizeOptionalFileSize(value: unknown, field = "File size"): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_ATTACHMENT_SIZE
  ) {
    throw new RequestError(`${field} must be a positive integer within the allowed limit`);
  }
  return value;
}

export function normalizeUploadIntent(value: unknown): "message" | "profile" {
  if (value !== "message" && value !== "profile") {
    throw new RequestError("Invalid upload intent");
  }
  return value;
}

export function normalizeAttachmentResourceType(value: unknown): AttachmentResourceType {
  if (
    value !== "image" &&
    value !== "video" &&
    value !== "audio" &&
    value !== "raw"
  ) {
    throw new RequestError("Invalid attachment resource type");
  }
  return value;
}

function positiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RequestError(`${field} must be a positive number`);
  }
  return value;
}

export function normalizeAttachments(
  value: unknown,
  field = "Attachments"
): IAttachment[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new RequestError(`${field} must be an array`);
  }
  if (value.length > MAX_ATTACHMENT_COUNT) {
    throw new RequestError(`${field} must contain at most ${MAX_ATTACHMENT_COUNT} items`);
  }

  return value.map((item, index) => {
    const label = `${field}[${index}]`;
    const attachment = requireRecord(item, label);
    const url = normalizeStoredFileUrl(attachment.url, `${label}.url`);
    const publicId = boundedString(attachment.publicId, `${label}.publicId`, 1, 512);
    const resourceType = normalizeAttachmentResourceType(attachment.resourceType);
    const mimeType = normalizeContentType(attachment.mimeType, `${label}.mimeType`);

    if (
      (resourceType === "image" || resourceType === "video" || resourceType === "audio") &&
      normalizeMimeType(mimeType) !== resourceType
    ) {
      throw new RequestError(`${label}.mimeType does not match the attachment type`);
    }
    const fileName = boundedString(attachment.fileName, `${label}.fileName`, 1, 255);

    if (
      typeof attachment.size !== "number" ||
      !Number.isInteger(attachment.size) ||
      attachment.size <= 0 ||
      attachment.size > MAX_ATTACHMENT_SIZE
    ) {
      throw new RequestError(`${label}.size must be a positive integer within the allowed limit`);
    }

    const normalized: IAttachment = {
      url,
      publicId,
      resourceType,
      mimeType,
      fileName,
      size: attachment.size,
    };

    if (attachment.format !== undefined && attachment.format !== null) {
      normalized.format = boundedString(attachment.format, `${label}.format`, 1, 20);
    }
    if (attachment.width !== undefined && attachment.width !== null) {
      normalized.width = positiveNumber(attachment.width, `${label}.width`);
    }
    if (attachment.height !== undefined && attachment.height !== null) {
      normalized.height = positiveNumber(attachment.height, `${label}.height`);
    }
    if (attachment.duration !== undefined && attachment.duration !== null) {
      normalized.duration = positiveNumber(attachment.duration, `${label}.duration`);
    }

    return normalized;
  });
}
