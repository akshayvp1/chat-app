import { Router } from "express";
import { container } from "tsyringe";
import GroupController from "../controllers/groupController";
import { authMiddleware } from "../middleware/authMiddleware";

const groupRouter = Router();
const groupController = container.resolve(GroupController);

groupRouter.post("/", authMiddleware, groupController.createGroup);
groupRouter.get("/my-groups", authMiddleware, groupController.getMyGroups);
groupRouter.get("/:groupId/messages", authMiddleware, groupController.getGroupMessages);
groupRouter.post("/:groupId/members", authMiddleware, groupController.addMember);
groupRouter.delete("/:groupId/members", authMiddleware, groupController.removeMember);

export default groupRouter;