import express from "express";
import userRoutes from "./userRoutes";
import chatRouter from "./chatRoutes";
import groupRouter from "./groupRouter";
import callRouter from "./callRoutes";
import groupCallRoutes from "./groupCallRoutes";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/chat", chatRouter);
router.use("/group", groupRouter);
router.use("/call", callRouter);
router.use("/group-call", groupCallRoutes);

export default router;
