import { Request, Response } from "express";

export interface ResetPasswordParams {
  token: string;
}

export interface IUserAuthController {
  register(req: Request, res: Response): Promise<Response>;

  login(req: Request, res: Response): Promise<Response>;

  verifyOtp(req: Request, res: Response): Promise<Response>;

  resendOtp(req: Request, res: Response): Promise<Response>;

  forgotPassword(req: Request, res: Response): Promise<Response>;

  resetPassword(
    req: Request<ResetPasswordParams>,
    res: Response
  ): Promise<Response>;

  getUsers(req: Request, res: Response): Promise<Response>;

  refreshToken(req: Request, res: Response): Promise<Response>;

  logout(req: Request, res: Response): Promise<Response>;
}