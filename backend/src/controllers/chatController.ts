import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import ChatService from "../services/chatService";

@injectable()
class ChatController {
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
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const receiverId = String(req.params.receiverId);

      const messages = await this.chatService.getMessages(
        senderId,
        receiverId
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
      });
    }
  };
}

export default ChatController;