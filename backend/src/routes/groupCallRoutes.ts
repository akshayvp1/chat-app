import { Router } from "express";
import { container } from "tsyringe";
import GroupCallController from "../controllers/groupCallController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const groupCallController = container.resolve(GroupCallController);

// GET /api/group-call/history/:groupId
router.get("/history/:groupId", authMiddleware, groupCallController.getHistory);

export default router;