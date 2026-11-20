import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IUserAuthController, ResetPasswordParams } from "../controllers/interface/IUserAuthController";
import UserAuthService from "../services/userAuthService";
import { ProfileUpdate } from "../interfaces/IUser";
import {
  RequestError,
  boundedString,
  normalizeEmail,
  normalizeStoredFileUrl,
  normalizeLoginPassword,
  normalizeName,
  normalizeOtp,
  normalizePassword,
  normalizePhone,
  normalizeResetToken,
  requireRecord,
} from "../utils/validation";
import { clearAuthCookies, setAccessTokenCookie, setAuthCookies } from "../utils/authCookies";
import {
  sendAuthSuccess,
  sendFixedFailure,
  sendInvalidCredentials,
  sendJsonSuccess,
  sendMessageResponse,
  sendPublicFailure,
  sendRequestError,
  sendUnauthorized,
  sendUpdateProfileFailure,
} from "./auth/responses";

@injectable()
class UserAuthController implements IUserAuthController {
  constructor(
    @inject("UserAuthService") private userAuthService: UserAuthService,
  ) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = requireRecord(req.body);
      const name = normalizeName(body.name);
      const email = normalizeEmail(body.email);
      const phone = normalizePhone(body.phone);
      const password = normalizePassword(body.password);

      const response = await this.userAuthService.register(name, email, phone, password);

      return res.status(200).json(response);
    } catch (error) {
      return sendPublicFailure(res, error, "Registration failed", 500, [
        "User already exists",
      ]);
    }
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = requireRecord(req.body);
      const email = normalizeEmail(body.email);
      const password = normalizeLoginPassword(body.password);

      const result = await this.userAuthService.login(email, password);

      setAuthCookies(res, result);

      return sendAuthSuccess(res, "Login successful", result.user);
    } catch (error) {
      if (error instanceof RequestError) {
        return sendRequestError(res, error);
      }

      return sendInvalidCredentials(res, error);
    }
  };

  verifyOtp = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = requireRecord(req.body);
      const email = normalizeEmail(body.email);
      const otp = normalizeOtp(body.otp);

      const result = await this.userAuthService.verifyOtp(email, otp);

      setAuthCookies(res, result);

      return sendAuthSuccess(res, "OTP verified successfully", result.user);
    } catch (error) {
      return sendFixedFailure(res, 400, error, "Invalid or expired OTP", [
        "Invalid OTP",
      ]);
    }
  };

  resendOtp = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = requireRecord(req.body);
      const email = normalizeEmail(body.email);
      await this.userAuthService.resendOtp(email);
      return sendMessageResponse(res, 200, "OTP resent successfully");
    } catch (error) {
      return sendFixedFailure(res, 400, error, "Failed to resend OTP");
    }
  };

  forgotPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const body = requireRecord(req.body);
      const email = normalizeEmail(body.email);

      const result = await this.userAuthService.forgotPassword(email);

      return res.status(200).json(result);
    } catch (error) {
      return sendFixedFailure(res, 400, error, "Unable to process password reset request");
    }
  };

  resetPassword = async (
    req: Request<ResetPasswordParams>,
    res: Response,
  ): Promise<Response> => {
    try {
      const token = normalizeResetToken(req.params.token);
      const body = requireRecord(req.body);
      const password = normalizePassword(body.password);

      await this.userAuthService.resetPassword(token, password);

      return sendMessageResponse(res, 200, "Password reset successful");
    } catch (error) {
      return sendPublicFailure(res, error, "Failed to reset password", 500, [
        "Reset link expired or invalid",
      ]);
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendUnauthorized(res);
      }

      const body = requireRecord(req.body);
      const updates: ProfileUpdate = {};

      if (body.name !== undefined) {
        updates.name = normalizeName(body.name);
      }
      if (body.bio !== undefined) {
        updates.bio = boundedString(body.bio, "Bio", 0, 300);
      }
      if (body.profile !== undefined) {
        updates.profile = normalizeStoredFileUrl(body.profile, "Profile URL");
      }
      if (Object.keys(updates).length === 0) {
        throw new RequestError("No profile changes provided");
      }

      const user = await this.userAuthService.updateProfile(userId, updates);

      return sendJsonSuccess(res, { success: true, user });
    } catch (error) {
      return sendUpdateProfileFailure(res, error);
    }
  };

  getUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error("userId is required");
      }

      const users = await this.userAuthService.getUsers(userId);

      return sendJsonSuccess(res, { users });
    } catch {
      return sendMessageResponse(res, 500, "Failed to fetch users");
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return sendMessageResponse(res, 400, "Refresh token is required");
      }

      const result = await this.userAuthService.refreshToken(refreshToken);

      setAccessTokenCookie(res, result.accessToken);

      return sendJsonSuccess(res, { success: true });
    } catch {
      return sendMessageResponse(res, 401, "Invalid refresh token");
    }
  };

  logout = async (_req: Request, res: Response): Promise<Response> => {
    clearAuthCookies(res);

    return sendMessageResponse(res, 200, "Logout successful");
  };
}

export default UserAuthController;
