import { Request, Response } from "express";

export interface IUploadController {
  uploadProfileImage(req: Request, res: Response): Promise<void>;
  uploadMessageAttachments(req: Request, res: Response): Promise<void>;
}
