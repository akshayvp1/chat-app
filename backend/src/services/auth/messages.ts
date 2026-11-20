export const SERVICE_MESSAGES = {
  userAlreadyExists: "User already exists",
  invalidOtp: "Invalid OTP",
  userNotFound: "User not found",
  invalidCredentials: "Invalid credentials",
  resetLinkInvalid: "Reset link expired or invalid",
  invalidRefreshToken: "Invalid refresh token",
} as const;

export const createServiceError = (message: string): Error => new Error(message);
