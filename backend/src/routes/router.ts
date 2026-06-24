import express from "express";
import userRoutes from "./userRoutes";
import chatRouter from "./chatRoutes";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/chat", chatRouter);

export default router;