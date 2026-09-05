import { Router } from "express";
import { container } from "tsyringe";
import CallController from "../controllers/callController";

const router = Router();
const callController = container.resolve(CallController);

// GET /api/call/history
router.get("/history", callController.getHistory);

export default router;
