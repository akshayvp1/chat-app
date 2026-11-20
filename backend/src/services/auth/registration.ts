import { generateOtp } from "../../utils/generateOtp";
import { SERVICE_MESSAGES, createServiceError } from "./messages";

export interface PendingRegistration {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export const createRegistrationOtp = (): string => generateOtp();

export const parsePendingRegistration = (
  userData: string
): { otp: unknown; user: PendingRegistration } => {
  const { otp, ...user } = JSON.parse(userData);
  return { otp, user };
};

export const replaceRegistrationOtp = (userData: string, otp: string): string => {
  const parsedData = JSON.parse(userData);
  parsedData.otp = otp;
  return JSON.stringify(parsedData);
};

export const assertOtpMatches = (providedOtp: string, storedOtp: unknown): void => {
  if (providedOtp !== storedOtp) {
    throw createServiceError(SERVICE_MESSAGES.invalidOtp);
  }
};
