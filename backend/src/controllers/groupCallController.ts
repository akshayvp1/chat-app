import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IGroupCallService } from "../services/interface/IGroupCallService";

@injectable()
export default class GroupCallController {
  constructor(@inject("GroupCallService") private groupCallService: IGroupCallService) {}

  getHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const groupId = req.params.groupId as string;
      const history = await this.groupCallService.getHistory(groupId);

      return res.status(200).json({ success: true, data: history });
    } catch (error) {
      console.error("getGroupCallHistory error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch group call history" });
    }
  };
}