import axiosInstance from "../../utils/axiosInstance";
import { getErrorMessage } from "../../utils/errorHandler";

import type {
  RegisterPayload,
  RegisterResponse,
  LoginPayload,
  LoginResponse,
  OtpVerifyPayload,
  OtpResendPayload,
  VerifyOtpResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload
} from "../../types/types";

const API_BASE_URL = "/user";

type AuthResult<T> =
  | {
      success: true;
      data: T;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

export const register = async (
  payload: RegisterPayload
): Promise<AuthResult<RegisterResponse>> => {
  try {
    const response = await axiosInstance.post<RegisterResponse>(
      `${API_BASE_URL}/register`,
      payload
    );

    return {
      success: true,
      data: response.data,
      message: response.data.message,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(
        error,
        "Registration failed. Please try again."
      ),
    };
  }
};

export const login = async (
  payload: LoginPayload
): Promise<AuthResult<LoginResponse>> => {
  try {
    const response = await axiosInstance.post<LoginResponse>(
      `${API_BASE_URL}/login`,
      payload
    );
      
    return {
      success: true,
      data: response.data,
      message: "Login successful",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(
        error,
        "Login failed. Please try again."
      ),
    };
  }
};




async function verifyOtp(
  payload: OtpVerifyPayload
): Promise<AuthResult<VerifyOtpResponse>> {
  try {
    const response =
      await axiosInstance.post<VerifyOtpResponse>(
        `${API_BASE_URL}/verify-otp`,
        payload
      );

    return {
      success: true,
      data: response.data,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "OTP verification failed. Please try again.",
    };
  }
}

async function resendOtp(payload: OtpResendPayload): Promise<AuthResult<{ message: string }>> {
  try {
    const response = await axiosInstance.post<{ message: string }>(`${API_BASE_URL}/resend-otp`, payload);
    return { success: true, data: response.data, message: response.data.message };
  } catch (error) {
    return {
      success: false,
      message:"Failed to resend OTP. Please try again.",
    };
  }
}


  async function forgotPassword(payload: ForgotPasswordPayload): Promise<AuthResult<{ message: string }>> {
  try {
    const response = await axiosInstance.post<{ message: string }>(`${API_BASE_URL}/forgot-password`, payload);
    return { success: true, data: response.data, message: response.data.message };
  } catch (error) {
    return {
      success: false,
      message: "Failed to send reset link. Please try again.",
    };
  }
}


async function resetPassword(
  payload: ResetPasswordPayload
): Promise<AuthResult<{ message: string }>> {
  try {
    const response = await axiosInstance.post(
      `${API_BASE_URL}/reset-password/${payload.token}`,
      {
        password: payload.password,
      }
    );

    return {
      success: true,
      data: response.data,
      message: response.data.message,
    };
  } catch {
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
    };
  }
}


const authService = {
  register,
  login,
  verifyOtp,
   resendOtp,
   forgotPassword,
   resetPassword
};

export default authService;