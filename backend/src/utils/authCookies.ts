import { Response } from "express";
import {
  getAccessTokenMaxAgeMs,
  getRefreshTokenMaxAgeMs,
} from "./jwt";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

/**
 * Single source of truth for auth cookie flags. Keeping the `maxAge` next to
 * the TTL that produced the token guarantees the cookie can never outlive
 * (or under-live) the JWT inside it.
 */
const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
});

export const setAccessTokenCookie = (res: Response, token: string): void => {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseOptions(),
    maxAge: getAccessTokenMaxAgeMs(),
  });
};

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    maxAge: getRefreshTokenMaxAgeMs(),
  });
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken?: string }
): void => {
  setAccessTokenCookie(res, tokens.accessToken);
  if (tokens.refreshToken) setRefreshTokenCookie(res, tokens.refreshToken);
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, baseOptions());
  res.clearCookie(REFRESH_COOKIE, baseOptions());
};
