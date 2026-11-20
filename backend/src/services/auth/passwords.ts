import bcrypt from "bcryptjs";
import { SERVICE_MESSAGES, createServiceError } from "./messages";

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 10);

export const assertPasswordMatches = async (
  password: string,
  passwordHash: string
): Promise<void> => {
  const isMatch = await bcrypt.compare(password, passwordHash);
  if (!isMatch) {
    throw createServiceError(SERVICE_MESSAGES.invalidCredentials);
  }
};
