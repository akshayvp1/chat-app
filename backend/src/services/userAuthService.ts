import { inject, injectable } from "tsyringe";
import { IUserAuthService } from "../services/interface/IUserAuthService";
import { IUser, ProfileUpdate } from "../interfaces/IUser";
import UserAuthRepository from "../repositories/userAuthRepository";
import redisClient from "../config/redis";
import { sendOtpMail } from "../utils/sendOtpMail";
import { sendResetPasswordMail } from "../utils/forgotPassword";
import { RequestError } from "../utils/validation";
import { createServiceError, SERVICE_MESSAGES } from "./auth/messages";
import {
  buildResetLink,
  createAccessToken,
  createAuthTokens,
  createResetToken,
  getRefreshTokenUserId,
} from "./auth/tokens";
import { assertPasswordMatches, hashPassword } from "./auth/passwords";
import {
  assertOtpMatches,
  createRegistrationOtp,
  parsePendingRegistration,
  replaceRegistrationOtp,
} from "./auth/registration";
import {
  buildOtpResentResponse,
  buildPasswordResetResponse,
  buildRegistrationResponse,
  buildResetLinkResponse,
  LoginResponse,
} from "./auth/responses";

@injectable()
class UserAuthService implements IUserAuthService {
  constructor(
    @inject("UserAuthRepository")
    private userAuthRepository: UserAuthRepository
  ) {}

  register = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<{
    message: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  }> => {
    const existingUser = await this.userAuthRepository.findByEmail(email);
    if (existingUser) {
      throw createServiceError(SERVICE_MESSAGES.userAlreadyExists);
    }

    const hashedPassword = await hashPassword(password);
    const otp = createRegistrationOtp();

    await redisClient.set(
      `register:${email}`,
      JSON.stringify({ name, email, phone, password: hashedPassword, otp }),
      { EX: 300 }
    );

    await sendOtpMail(email, otp);

    return buildRegistrationResponse(name, email, phone);
  };

  verifyOtp = async (email: string, otp: string) => {
    const userData = await redisClient.get(`register:${email}`);
    if (!userData) {
      throw createServiceError(SERVICE_MESSAGES.invalidOtp);
    }

    const { otp: storedOtp, user } = parsePendingRegistration(userData);
    assertOtpMatches(otp, storedOtp);

    const createdUser = await this.userAuthRepository.createUser(user);
    const { accessToken, refreshToken } = createAuthTokens(createdUser);

    await redisClient.del(`register:${email}`);

    return { accessToken, refreshToken, user: createdUser };
  };

  resendOtp = async (email: string) => {
    const userData = await redisClient.get(`register:${email}`);
    if (!userData) {
      throw createServiceError(SERVICE_MESSAGES.userNotFound);
    }

    const otp = createRegistrationOtp();
    await redisClient.set(`register:${email}`, replaceRegistrationOtp(userData, otp), {
      EX: 300,
    });
    await sendOtpMail(email, otp);

    return buildOtpResentResponse();
  };

  login = async (email: string, password: string): Promise<LoginResponse> => {
    const user = await this.userAuthRepository.findByEmail(email);
    if (!user) {
      throw createServiceError(SERVICE_MESSAGES.userNotFound);
    }

    await assertPasswordMatches(password, user.password);

    const { accessToken, refreshToken } = createAuthTokens(user);
    return { accessToken, refreshToken, user };
  };

  forgotPassword = async (email: string) => {
    const user = await this.userAuthRepository.findByEmail(email);
    if (!user) {
      throw createServiceError(SERVICE_MESSAGES.userNotFound);
    }

    const token = createResetToken();
    await redisClient.set(`reset:${token}`, user._id.toString(), { EX: 900 });
    await sendResetPasswordMail(email, buildResetLink(token));

    return buildResetLinkResponse();
  };

  resetPassword = async (token: string, password: string) => {
    const userId = await redisClient.get(`reset:${token}`);
    if (!userId) {
      throw createServiceError(SERVICE_MESSAGES.resetLinkInvalid);
    }

    const hashedPassword = await hashPassword(password);
    await this.userAuthRepository.updatePassword(userId, hashedPassword);
    await redisClient.del(`reset:${token}`);

    return buildPasswordResetResponse();
  };

  updateProfile = async (userId: string, updates: ProfileUpdate): Promise<IUser> => {
    const user = await this.userAuthRepository.updateProfile(userId, updates);
    if (!user) {
      throw new RequestError("User not found", 404);
    }
    return user;
  };

  getUsers = async (userId: string) => {
    return await this.userAuthRepository.getUsers(userId);
  };

  refreshToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
    try {
      const userId = getRefreshTokenUserId(refreshToken);
      const user = await this.userAuthRepository.findById(userId);
      if (!user) {
        throw createServiceError(SERVICE_MESSAGES.userNotFound);
      }

      const accessToken = createAccessToken(user);
      return { accessToken };
    } catch {
      throw createServiceError(SERVICE_MESSAGES.invalidRefreshToken);
    }
  };
}

export default UserAuthService;
