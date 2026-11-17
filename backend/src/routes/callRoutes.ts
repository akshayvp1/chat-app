import { Router } from "express";
import { container } from "tsyringe";
import CallController from "../controllers/callController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const callController = container.resolve(CallController);

// GET /api/call/history
router.get("/history", authMiddleware, callController.getHistory);

export default router;
