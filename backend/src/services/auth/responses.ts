import { IUser } from "../../interfaces/IUser";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export interface RegistrationResponse {
  message: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
}

export const buildRegistrationResponse = (
  name: string,
  email: string,
  phone: string
): RegistrationResponse => ({
  message: "OTP sent successfully",
  user: { name, email, phone },
});

export const buildOtpResentResponse = (): { message: string } => ({
  message: "OTP resent successfully",
});

export const buildResetLinkResponse = (): { message: string } => ({
  message: "Password reset link sent successfully",
});

export const buildPasswordResetResponse = (): { message: string } => ({
  message: "Password reset successfully",
});
