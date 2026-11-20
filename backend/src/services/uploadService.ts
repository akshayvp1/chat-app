import { inject, injectable } from "tsyringe";
import { Model } from "mongoose";
import { IUploadService, UploadIntent } from "./interface/IUploadService";
import { IAttachment } from "../interfaces/IAttachment";
import { IUser } from "../interfaces/IUser";
import { IGroupService } from "./interface/IGroupService";
import { isGroupMember, RequestError, requireObjectId } from "../utils/validation";
import { uploadToCloudinary } from "../config/cloudinary";

@injectable()
class UploadService implements IUploadService {
  constructor(
    @inject("User") private userModel: Model<IUser>,
    @inject("GroupService") private groupService: IGroupService
  ) {}

  async validateTarget(
    userId: string,
    body: Record<string, unknown>,
    intent: UploadIntent
  ): Promise<void> {
    if (intent === "profile") return;

    const receiverId = body.receiverId;
    const groupId = body.groupId;

    if (typeof receiverId === "string" && receiverId.length > 0) {
      const validReceiverId = requireObjectId(receiverId, "receiver ID");

      if (validReceiverId === userId) {
        throw new RequestError("You cannot send a file to yourself");
      }

      const receiver = await this.userModel.exists({ _id: validReceiverId });
      if (!receiver) {
        throw new RequestError("Recipient not found", 404);
      }

      return;
    }

    if (typeof groupId === "string" && groupId.length > 0) {
      const validGroupId = requireObjectId(groupId, "group ID");
      const group = await this.groupService.getGroupById(validGroupId);

      if (!group || !isGroupMember(group, userId)) {
        throw new RequestError("You are not a member of this group", 403);
      }

      return;
    }

    throw new RequestError("A recipient or group is required for file uploads");
  }

  async buildAttachments(
    files: Express.Multer.File[],
    intent: UploadIntent
  ): Promise<IAttachment[]> {
    if (files.length === 0) {
      throw new RequestError("Choose at least one file to upload");
    }

    const attachments: IAttachment[] = [];

    for (const file of files) {
      if (!file.buffer || file.buffer.length === 0) {
        throw new RequestError("Uploaded file is empty or invalid");
      }

      const attachment = await uploadToCloudinary(file, intent);
      attachments.push(attachment);
    }

    return attachments;
  }
}

export default UploadService;
