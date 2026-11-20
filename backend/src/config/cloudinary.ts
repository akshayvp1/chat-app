import { v2 as cloudinary } from "cloudinary";
import { RequestError } from "../utils/validation";
import type { UploadIntent } from "../services/interface/IUploadService";
import type { AttachmentResourceType, IAttachment } from "../interfaces/IAttachment";
import { resolveAttachmentResourceType, sanitizeFileName } from "../utils/validation";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const missing: string[] = [];

  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length > 0) {
    throw new RequestError(
      `Missing Cloudinary configuration: ${missing.join(", ")}`,
      503
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

function toCloudinaryResourceType(
  resourceType: AttachmentResourceType
): "image" | "video" | "raw" {
  if (resourceType === "image") return "image";
  if (resourceType === "video" || resourceType === "audio") return "video";
  return "raw";
}

export async function uploadToCloudinary(
  file: Express.Multer.File,
  intent: UploadIntent
): Promise<IAttachment> {
  ensureConfigured();

  const resourceType = resolveAttachmentResourceType(file.mimetype, intent);
  const folder = intent === "profile" ? "chatapp/profiles" : "chatapp/messages";
  const cloudinaryResourceType = toCloudinaryResourceType(resourceType);

  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: cloudinaryResourceType,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(uploaded);
      }
    );

    stream.end(file.buffer);
  });

  const url: string = result.secure_url || result.url;
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) {
    throw new RequestError("Upload did not return a valid file URL.", 502);
  }

  const attachment: IAttachment = {
    url,
    publicId: typeof result.public_id === "string" ? result.public_id : "",
    resourceType,
    mimeType: file.mimetype.toLowerCase().split(";")[0].trim(),
    fileName: sanitizeFileName(file.originalname),
    size: typeof result.bytes === "number" ? result.bytes : file.size,
  };

  if (typeof result.format === "string" && result.format) {
    attachment.format = result.format;
  }
  if (typeof result.width === "number" && Number.isFinite(result.width)) {
    attachment.width = result.width;
  }
  if (typeof result.height === "number" && Number.isFinite(result.height)) {
    attachment.height = result.height;
  }
  if (typeof result.duration === "number" && Number.isFinite(result.duration)) {
    attachment.duration = result.duration;
  }

  if (!attachment.publicId) {
    throw new RequestError("Upload did not return a valid file identifier.", 502);
  }

  return attachment;
}
