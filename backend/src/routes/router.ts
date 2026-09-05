import express from "express";
import userRoutes from "./userRoutes";
import chatRouter from "./chatRoutes";
import groupRouter from "./groupRouter";
import callRouter from "./callRoutes";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/chat", chatRouter);
router.use("/group", groupRouter);
router.use("/call", callRouter);

export default router;
