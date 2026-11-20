import type { IAttachment } from "../../interfaces/IAttachment";

export type UploadIntent = "message" | "profile";

export interface UploadResultData {
  attachments: IAttachment[];
}

export interface IUploadService {
  validateTarget(
    userId: string,
    body: Record<string, unknown>,
    intent: UploadIntent
  ): Promise<void>;
  buildAttachments(files: Express.Multer.File[], intent: UploadIntent): Promise<IAttachment[]>;
}
