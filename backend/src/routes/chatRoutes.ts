import { Router } from "express";
import { container } from "tsyringe";
import ChatController from "../controllers/chatController";
import { authMiddleware } from "../middleware/authMiddleware";

const chatRouter = Router();

const chatController =
  container.resolve(ChatController);

chatRouter.get(
  "/messages/:receiverId",
  authMiddleware,
  chatController.getMessages
);

export default chatRouter;