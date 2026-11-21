import express from "express";
import userRoutes from "./userRoutes";
import chatRouter from "./chatRoutes";
import groupRouter from "./groupRouter";
import callRouter from "./callRoutes";
import groupCallRoutes from "./groupCallRoutes";
import uploadRoutes from "./uploadRoutes";
import rtcConfigRoutes from "./rtcConfigRoutes";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/chat", chatRouter);
router.use("/group", groupRouter);
router.use("/call", callRouter);
router.use("/group-call", groupCallRoutes);
router.use("/upload", uploadRoutes);
router.use("/rtc-config", rtcConfigRoutes);

export default router;
