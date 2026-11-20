import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import ChatService from "../services/chatService";
import { IChatController } from "../controllers/interface/IChatController";
import { RequestError, requireObjectId } from "../utils/validation";

@injectable()
class ChatController implements IChatController {
  constructor(
    @inject("ChatService")
    private chatService: ChatService
  ) {}

 getMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const senderId = req.user?.userId;

    if (!senderId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const receiverId = requireObjectId(req.params.receiverId, "receiver ID");

    if (receiverId === senderId) {
      throw new RequestError("Cannot open a conversation with yourself");
    }

    const messages = await this.chatService.getMessages(
      senderId,
      receiverId
    );

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    if (error instanceof RequestError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("GET MESSAGES ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

  getUnreadCounts = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const receiverId = req.user?.userId;

      if (!receiverId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const counts = await this.chatService.getUnreadCounts(receiverId);

      res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      console.error("GET UNREAD COUNTS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch unread counts",
      });
    }
  };
}

export default ChatController;