import { Request, Response } from "express";

export interface IGroupController {
  createGroup(
    req: Request,
    res: Response
  ): Promise<void>;

  getMyGroups(
    req: Request,
    res: Response
  ): Promise<void>;

  getGroupMessages(
    req: Request,
    res: Response
  ): Promise<void>;

  addMember(
    req: Request,
    res: Response
  ): Promise<void>;

  removeMember(
    req: Request,
    res: Response
  ): Promise<void>;
}