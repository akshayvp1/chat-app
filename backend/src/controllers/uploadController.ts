import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IUploadController } from "./interface/IUploadController";
import UploadService from "../services/uploadService";
import {
  getPublicErrorMessage,
  isRecord,
  RequestError,
} from "../utils/validation";

@injectable()
class UploadController implements IUploadController {
  constructor(
    @inject("UploadService") private uploadService: UploadService
  ) {}

  uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;

    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new RequestError("Unauthorized", 401);
      }

      if (!file) {
        throw new RequestError("Choose an image to upload");
      }

      const attachments = await this.uploadService.buildAttachments([file], "profile");

      res.status(201).json({
        success: true,
        data: {
          attachment: attachments[0],
          attachments,
        },
      });
    } catch (error) {
      const message = getPublicErrorMessage(error, "Failed to upload profile picture");

      res.status(error instanceof RequestError ? error.status : 500).json({
        success: false,
        message,
      });
    }
  };

  uploadMessageAttachments = async (req: Request, res: Response): Promise<void> => {
    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new RequestError("Unauthorized", 401);
      }

      const body = isRecord(req.body) ? req.body : {};
      await this.uploadService.validateTarget(userId, body, "message");

      if (files.length === 0) {
        throw new RequestError("Choose at least one file to upload");
      }

      const attachments = await this.uploadService.buildAttachments(files, "message");

      res.status(201).json({
        success: true,
        data: {
          attachments,
        },
      });
    } catch (error) {
      const message = getPublicErrorMessage(error, "Failed to upload files");

      res.status(error instanceof RequestError ? error.status : 500).json({
        success: false,
        message,
      });
    }
  };
}

export default UploadController;
