import { IUser, ProfileUpdate, PublicUser } from "../../interfaces/IUser";

export interface IUserAuthService {
  register(
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
  }>;

  verifyOtp(
    email: string,
    otp: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: PublicUser;
  }>;

  resendOtp(
    email: string
  ): Promise<{
    message: string;
  }>;

  login(
    email: string,
    password: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: PublicUser;
  }>;

  forgotPassword(
    email: string
  ): Promise<{
    message: string;
  }>;

  resetPassword(
    token: string,
    password: string
  ): Promise<{
    message: string;
  }>;

  updateProfile(userId: string, updates: ProfileUpdate): Promise<PublicUser>;

  getUsers(userId: string): Promise<PublicUser[]>;

  refreshToken(
    refreshToken: string
  ): Promise<{
    accessToken: string;
  }>;
}
