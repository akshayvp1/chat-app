import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import authService from "@/services/user/userAuthService";
import type { OtpResendPayload, OtpVerifyPayload } from "../types/types";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { clearPendingUser, loginSuccess } from "../redux/slices/authSlice";
import { clearPendingOtpEmail, readPendingOtpEmail } from "../utils/otpSession";
import { OTP_LENGTH, normalizeText, validateOtp } from "../utils/validation";

const RESEND_SECONDS = 60;

export function useOtpVerification() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const pendingUser = useAppSelector((state) => state.auth.pendingUser);

  const [storedEmail] = useState(() => normalizeText(readPendingOtpEmail() ?? ""));
  const email = normalizeText(pendingUser?.email ?? storedEmail);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  function handleChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join("");
    if (newDigits.every(Boolean) && code.length === OTP_LENGTH) {
      void handleVerify(code);
    }
  }

  function handleKeyDown(
    index: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => (newDigits[i] = char));
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === OTP_LENGTH) {
      void handleVerify(pasted);
    }
  }

  async function handleVerify(codeOverride?: string) {
    const otp = codeOverride ?? digits.join("");
    const otpError = validateOtp(otp);

    if (otpError) {
      setError(otpError);
      return;
    }

    if (!email) {
      setApiError("Your verification session expired. Please register again.");
      return;
    }

    setIsLoading(true);
    setApiError("");
    setError("");

    try {
      const payload: OtpVerifyPayload = {
        email,
        otp,
      };

      const result = await authService.verifyOtp(payload);

      if (result.success) {
        dispatch(
          loginSuccess({
            user: result.data.user,
          }),
        );

        dispatch(clearPendingUser());
        clearPendingOtpEmail();

        setIsSuccess(true);

        redirectTimerRef.current = setTimeout(() => {
          navigate("/chat", { replace: true });
        }, 1500);
      } else {
        setApiError(result.message);
      }
    } catch {
      setApiError("OTP verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setApiError("Your verification session expired. Please register again.");
      return;
    }

    setIsResending(true);
    setApiError("");

    const payload: OtpResendPayload = { email };
    const result = await authService.resendOtp(payload);

    if (result.success) {
      setTimer(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } else {
      setApiError(result.message);
    }

    setIsResending(false);
  }

  return {
    email,
    digits,
    error,
    apiError,
    isSuccess,
    isLoading,
    isResending,
    timer,
    inputRefs,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleVerify,
    handleResend,
  };
}
