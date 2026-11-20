import multer from "multer";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { UploadIntent } from "../services/interface/IUploadService";
import {
  MAX_ATTACHMENT_SIZE,
  MAX_PROFILE_IMAGE_SIZE,
  RequestError,
  resolveAttachmentResourceType,
} from "../utils/validation";

export function createUploadMiddleware(intent: UploadIntent): RequestHandler {
  const isProfile = intent === "profile";
  const maxFiles = isProfile ? 1 : 5;
  const maxSize = isProfile ? MAX_PROFILE_IMAGE_SIZE : MAX_ATTACHMENT_SIZE;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
      files: maxFiles,
      fields: 20,
      parts: maxFiles + 20,
    },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) => {
      try {
        resolveAttachmentResourceType(file.mimetype, intent);
        callback(null, true);
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });

  return isProfile ? upload.single("file") : upload.array("files", maxFiles);
}

export function runUpload(
  middleware: RequestHandler,
  intent: UploadIntent
): RequestHandler {
  const maxSize = intent === "profile" ? MAX_PROFILE_IMAGE_SIZE : MAX_ATTACHMENT_SIZE;
  const maxMb = Math.floor(maxSize / (1024 * 1024));

  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(new RequestError(`File is too large. Maximum size is ${maxMb}MB.`, 413));
          return;
        }

        if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
          next(new RequestError(
            intent === "profile"
              ? "Choose exactly one image file."
              : "You can attach up to 5 files per message."
          ));
          return;
        }

        next(new RequestError("Upload failed. Please try again.", 400));
        return;
      }

      next(error);
    });
  };
}
