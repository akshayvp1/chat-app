import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getRtcConfigController } from "../controllers/rtcConfigController";

const router = express.Router();

router.get("/", authMiddleware, getRtcConfigController);
router.get("/config", authMiddleware, getRtcConfigController);

export default router;
