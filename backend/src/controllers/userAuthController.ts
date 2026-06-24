import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IUserAuthController } from "../controllers/interface/IUserAuthController";
import UserAuthService from "../services/userAuthService";

interface ResetPasswordParams {
  token: string;
}

@injectable()
class UserAuthController implements IUserAuthController {
  constructor(
    @inject("UserAuthService") private userAuthService: UserAuthService,
  ) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { name, email, phone, password } = req.body;

      const response = await this.userAuthService.register(
        name,
        email,
        phone,
        password,
      );

      return res.status(200).json(response);
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      return res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      });
    }
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, password } = req.body;

      const result = await this.userAuthService.login(email, password);

      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Login successful",
        user: result.user,
      });
    } catch (error) {
      return res.status(401).json({
        message: error instanceof Error ? error.message : "Unauthorized",
      });
    }
  };

  verifyOtp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    const result = await this.userAuthService.verifyOtp(
      email,
      otp
    );

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      user: result.user,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Invalid OTP",
    });
  }
};

  resendOtp = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email } = req.body;
      const result = await this.userAuthService.resendOtp(email);
      return res.status(200).json({
        message: "OTP resent successfully",
      });
    } catch (error) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Failed to resend OTP",
      });
    }
  };

  forgotPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email } = req.body;

      const result = await this.userAuthService.forgotPassword(email);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  resetPassword = async (
    req: Request<ResetPasswordParams>,
    res: Response,
  ): Promise<Response> => {
    const { token } = req.params;
    const { password } = req.body;

    await this.userAuthService.resetPassword(token, password);

    return res.status(200).json({
      message: "Password reset successful",
    });
  };

  getUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error("userId is required");
      }

      const users = await this.userAuthService.getUsers(userId);

      return res.status(200).json({ users });
    } catch {
      return res.status(500).json({
        message: "Failed to fetch users",
      });
    }
  };

  refreshToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    const result =
      await this.userAuthService.refreshToken(
        refreshToken
      );

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }
};


  logout = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Logout failed",
    });
  }
};
}

export default UserAuthController;
