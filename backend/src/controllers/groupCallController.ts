import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IGroupCallService } from "../services/interface/IGroupCallService";
import GroupService from "../services/groupService";
import { RequestError, isGroupMember, requireObjectId } from "../utils/validation";

@injectable()
export default class GroupCallController {
  constructor(
    @inject("GroupCallService") private groupCallService: IGroupCallService,
    @inject("GroupService") private groupService: GroupService
  ) {}

  getHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const groupId = requireObjectId(req.params.groupId, "group ID");
      const group = await this.groupService.getGroupById(groupId);

      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      if (!isGroupMember(group, userId)) {
        return res.status(403).json({ success: false, message: "Not a member of this group" });
      }

      const history = await this.groupCallService.getHistory(groupId);

      return res.status(200).json({ success: true, data: history });
    } catch (error) {
      if (error instanceof RequestError) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }

      console.error("getGroupCallHistory error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch group call history" });
    }
  };
}
