import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import GroupService from "../services/groupService";
import { IGroupController } from "./interface/IGroupController";

// Helper to safely extract userId set by authMiddleware
function getUserId(req: Request): string {
  const user = req.user as { userId: string } | undefined;
  if (!user?.userId) throw new Error("Unauthorized");
  return user.userId;
}

@injectable()
class GroupController implements IGroupController {
  constructor(@inject("GroupService") private groupService: GroupService) {}

  createGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = getUserId(req);
      const { name, description, memberIds } = req.body as {
        name: string;
        description: string;
        memberIds: string[];
      };
      const group = await this.groupService.createGroup(
        name,
        description,
        adminId,
        memberIds,
      );
      res.status(201).json({ success: true, data: group });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Failed to create group" });
    }
  };

  getMyGroups = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const groups = await this.groupService.getGroupsForUser(userId);
      res.status(200).json({ success: true, data: groups });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch groups" });
    }
  };

  getGroupMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const groupId = req.params["groupId"] as string;

      const messages = await this.groupService.getGroupMessages(groupId);

      const formattedMessages = messages.map((msg: any) => ({
        ...msg.toObject(),
        senderName: msg.senderId?.name,
      }));

      res.status(200).json({
        success: true,
        data: formattedMessages,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Failed to fetch group messages",
      });
    }
  };

  addMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const groupId = req.params["groupId"] as string;
      const { userId } = req.body as { userId: string };
      await this.groupService.addMember(groupId, userId);
      res.status(200).json({ success: true, message: "Member added" });
    } catch {
      res.status(500).json({ success: false, message: "Failed to add member" });
    }
  };

  removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const groupId = req.params["groupId"] as string;
      const { userId } = req.body as { userId: string };
      await this.groupService.removeMember(groupId, userId);
      res.status(200).json({ success: true, message: "Member removed" });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Failed to remove member" });
    }
  };
}

export default GroupController;
