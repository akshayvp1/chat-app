import jwt from "jsonwebtoken";
import crypto from "crypto";
import { IUser } from "../../interfaces/IUser";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const createAuthTokens = (user: IUser): AuthTokens => ({
  accessToken: generateAccessToken(user._id.toString(), user.email, user.name),
  refreshToken: generateRefreshToken(user._id.toString()),
});

export const createAccessToken = (user: IUser): string =>
  generateAccessToken(user._id.toString(), user.email, user.name);

export const getRefreshTokenUserId = (refreshToken: string): string =>
  (jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { userId: string }).userId;

export const createResetToken = (): string => crypto.randomBytes(32).toString("hex");

export const buildResetLink = (token: string): string =>
  `${process.env.CLIENT_URL}/reset-password/${token}`;
