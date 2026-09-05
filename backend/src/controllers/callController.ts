import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { ICallService } from "../services/interface/ICallService";

@injectable()
export default class CallController {
  constructor(@inject("ICallService") private callService: ICallService) {}

  getHistory = async (req: Request, res: Response) => {
    try {
      // Adjust this to however your auth middleware attaches the user
      const userId = (req as any).user?.id ?? (req as any).userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const history = await this.callService.getHistory(userId);
      return res.status(200).json({ success: true, data: history });
    } catch (error) {
      console.error("getHistory error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch call history" });
    }
  };
}
