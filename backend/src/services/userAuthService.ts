import {inject,injectable} from "tsyringe"
import {IUserAuthService} from "../services/interface/IUserAuthService"
import {IUser} from "../interfaces/IUser"
import UserAuthRepository from "../repositories/userAuthRepository";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis";
import { generateOtp } from "../utils/generateOtp";
import { sendOtpMail } from "../utils/sendOtpMail";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendResetPasswordMail } from "../utils/forgotPassword";


interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

@injectable()
class UserAuthService implements IUserAuthService{
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
  try {
    const existingUser =
      await this.userAuthRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const otp = generateOtp();

    await redisClient.set(
      `register:${email}`,
      JSON.stringify({
        name,
        email,
        phone,
        password: hashedPassword,
        otp,
      }),
      { EX: 300 }
    );

    await sendOtpMail(email, otp);

    return {
      message: "OTP sent successfully",
      user: {
        name,
        email,
        phone,
      },
    };
  } catch (error) {
    throw error;
  }
};

 verifyOtp = async(email: string, otp: string) => {
    try {
      const userData = await redisClient.get(`register:${email}`);

      if (!userData) {
        throw new Error("Invalid OTP");
      }

      const { otp: storedOtp, ...user } = JSON.parse(userData);
      console.log("Stored OTP:", storedOtp);
      console.log("Provided OTP:", otp);

      if (otp !== storedOtp) {
        throw new Error("Invalid OTP");
      }

      const createdUser = await this.userAuthRepository.createUser(user);

      const accessToken = generateAccessToken(createdUser._id.toString());
      const refreshToken = generateRefreshToken(createdUser._id.toString());

      await redisClient.del(`register:${email}`);

      return {
        accessToken,
        refreshToken,
        user: createdUser,
      };
    } catch (error) {
      throw error;
    }
  };

  resendOtp = async(email: string) => {
    try {
      const userData = await redisClient.get(`register:${email}`);

      if (!userData) {
        throw new Error("User not found");
      }

      const otp  = generateOtp();

    const parsedData = JSON.parse(userData);
    parsedData.otp = otp;

    await redisClient.set(
      `register:${email}`,
      JSON.stringify(parsedData),
      {
        EX: 300, // 5 minutes
      }
    );
      
      await sendOtpMail(email, otp);

      return {
        message: "OTP resent successfully",
      };
    } catch (error) {
      throw error;
    }
  };
  

 login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    try {
      const user = await this.userAuthRepository.findByEmail(
        email
      );

      if (!user) {
        throw new Error("User not found");
      }

      const isMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      const accessToken = generateAccessToken(
        user._id.toString()
      );

      const refreshToken = generateRefreshToken(
        user._id.toString()
      );

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      throw error;
    }
  };


  forgotPassword = async (email: string) => {
  const user =
    await this.userAuthRepository.findByEmail(email);

  if (!user) {
    throw new Error("User not found");
  }

  const token = crypto.randomBytes(32).toString("hex");

  await redisClient.set(
    `reset:${token}`,
    user._id.toString(),
    {
      EX: 900, // 15 minutes
    }
  );

  const resetLink =
    `${process.env.CLIENT_URL}/reset-password/${token}`;

  await sendResetPasswordMail(
    email,
    resetLink
  );

  return {
    message: "Password reset link sent successfully",
  };
};

resetPassword = async (
  token: string,
  password: string
) => {

  const userId = await redisClient.get(
    `reset:${token}`
  );
  console.log("service",userId)

  if (!userId) {
    throw new Error(
      "Reset link expired or invalid"
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  await this.userAuthRepository.updatePassword(
    userId,
    hashedPassword
  );

  await redisClient.del(
    `reset:${token}`
  );

  return {
    message: "Password reset successfully",
  };
};


 getUsers = async (userId: string) => {
    return await this.userAuthRepository.getUsers(
      userId
    );
  };

 refreshToken = async (
  refreshToken: string
): Promise<{
  accessToken: string;
}> => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as {
      userId: string;
    };

    const user =
      await this.userAuthRepository.findById(
        decoded.userId
      );

    if (!user) {
      throw new Error("User not found");
    }

    const accessToken =
      generateAccessToken(
        user._id.toString()
      );

    return {
      accessToken,
    };
  } catch (error) {
    throw new Error(
      "Invalid refresh token"
    );
  }
};

}
    export default UserAuthService;