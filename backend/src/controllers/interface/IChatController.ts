import { Request, Response } from "express";

export interface IChatController {
  getMessages(
    req: Request,
    res: Response
  ): Promise<void>;

  getUnreadCounts(
    req: Request,
    res: Response
  ): Promise<void>;
}