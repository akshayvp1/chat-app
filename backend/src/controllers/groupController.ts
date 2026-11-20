import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import GroupService from "../services/groupService";
import { IGroupController } from "./interface/IGroupController";
import {
  RequestError,
  boundedString,
  idToString,
  isGroupMember,
  requireObjectId,
  requireObjectIds,
  requireRecord,
} from "../utils/validation";

function getUserId(req: Request): string {
  const user = req.user as { userId: string } | undefined;
  if (!user?.userId) throw new RequestError("Unauthorized", 401);
  return user.userId;
}

function controllerFailure(error: unknown, fallback: string): { status: number; message: string } {
  if (error instanceof RequestError) {
    return { status: error.status, message: error.message };
  }
  return { status: 500, message: fallback };
}

@injectable()
class GroupController implements IGroupController {
  constructor(@inject("GroupService") private groupService: GroupService) {}

  createGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = getUserId(req);
      const body = requireRecord(req.body);
      const name = boundedString(body.name, "Group name", 2, 80);
      const description =
        body.description === undefined || body.description === null
          ? ""
          : boundedString(body.description, "Description", 0, 500);
      const memberIds = requireObjectIds(body.memberIds, "member IDs", 100);

      const group = await this.groupService.createGroup(
        name,
        description,
        adminId,
        memberIds,
      );
      res.status(201).json({ success: true, data: group });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to create group");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };

  getMyGroups = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const groups = await this.groupService.getGroupsForUser(userId);
      res.status(200).json({ success: true, data: groups });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to fetch groups");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };

  getGroupMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const groupId = requireObjectId(req.params["groupId"], "group ID");
      const group = await this.groupService.getGroupById(groupId);

      if (!group) {
        throw new RequestError("Group not found", 404);
      }

      if (!isGroupMember(group, userId)) {
        throw new RequestError("Not a member of this group", 403);
      }

      const messages = await this.groupService.getGroupMessages(groupId);

      const formattedMessages = messages.map((msg: any) => ({
        ...msg.toObject(),
        senderName: msg.senderId?.name,
      }));

      res.status(200).json({
        success: true,
        data: formattedMessages,
      });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to fetch group messages");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };

  addMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = getUserId(req);
      const groupId = requireObjectId(req.params["groupId"], "group ID");
      const body = requireRecord(req.body);
      const memberId = requireObjectId(body.userId, "user ID");
      const group = await this.groupService.getGroupById(groupId);

      if (!group) {
        throw new RequestError("Group not found", 404);
      }

      if (idToString(group.admin) !== requesterId) {
        throw new RequestError("Admin access required", 403);
      }

      await this.groupService.addMember(groupId, memberId);
      res.status(200).json({ success: true, message: "Member added" });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to add member");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };

  removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = getUserId(req);
      const groupId = requireObjectId(req.params["groupId"], "group ID");
      const body = requireRecord(req.body);
      const memberId = requireObjectId(body.userId, "user ID");
      const group = await this.groupService.getGroupById(groupId);

      if (!group) {
        throw new RequestError("Group not found", 404);
      }

      if (idToString(group.admin) !== requesterId) {
        throw new RequestError("Admin access required", 403);
      }

      if (memberId === idToString(group.admin)) {
        throw new RequestError("Admin cannot be removed");
      }

      await this.groupService.removeMember(groupId, memberId);
      res.status(200).json({ success: true, message: "Member removed" });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to remove member");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };

  getUnreadCounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const counts = await this.groupService.getUnreadCounts(userId);
      res.status(200).json({ success: true, data: counts });
    } catch (error) {
      const failure = controllerFailure(error, "Failed to fetch unread counts");
      res.status(failure.status).json({ success: false, message: failure.message });
    }
  };
}

export default GroupController;
