import { IUser } from "../../interfaces/IUser";

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
    user: IUser;
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
    user: IUser;
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

  getUsers(
    userId: string
  ): Promise<IUser[]>;

  refreshToken(
    refreshToken: string
  ): Promise<{
    accessToken: string;
  }>;
}