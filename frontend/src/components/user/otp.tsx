import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import authService from "../../services/user/userAuthService";
import type { OtpVerifyPayload, OtpResendPayload } from "../../types/types";
 import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  loginSuccess,
  clearPendingUser,
} from "../../redux/slices/authSlice";


const BRAND_COLOR = "#5b7cfa";
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function Otp() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const pendingUser = useAppSelector(
    (state) => state.auth.pendingUser
  );

const email = pendingUser?.email || "";


  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => (newDigits[i] = char));
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  }

  async function handleVerify() {
  const otp = digits.join("");

  if (otp.length < OTP_LENGTH) {
    setError("Please enter the complete code.");
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

    const result =
      await authService.verifyOtp(payload);

    if (result.success) {
      dispatch(
        loginSuccess({
          user: result.data.user,
        })
      );

      dispatch(clearPendingUser());

      setIsSuccess(true);

      setTimeout(() => {
        navigate("/chat");
      }, 1500);
    } else {
      setApiError(result.message);
    }
  } catch (error) {
    setApiError("OTP Verification Failed");
  } finally {
    setIsLoading(false);
  }
}

  async function handleResend() {
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50 p-4 sm:p-8 font-sans">
      <Card className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200/60">
        <CardContent className="p-8 sm:p-9">
          {isSuccess ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke={BRAND_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-lg font-extrabold text-slate-900">Verified!</p>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <p className="text-xl font-extrabold text-slate-900 mb-2 text-center">Verify your email</p>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Enter the {OTP_LENGTH}-digit code sent to{" "}
                <span className="font-semibold text-slate-700">{email || "your email"}</span>
              </p>

              <div className="flex justify-center gap-2 mb-4">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-11 h-12 text-center text-lg font-bold border-1.5 rounded-lg outline-none bg-slate-50 focus:border-indigo-400 ${
                      error ? "border-red-500 bg-red-50" : "border-slate-200"
                    }`}
                  />
                ))}
              </div>

              {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}

              {apiError && (
                <Alert variant="destructive" className="py-2 mb-3">
                  <AlertDescription className="text-xs text-center">{apiError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleVerify}
                disabled={isLoading}
                className="w-full rounded-full font-bold"
                style={{ backgroundColor: BRAND_COLOR, opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>

              <div className="flex items-center justify-center gap-1 mt-4 text-xs">
                <span className="text-gray-500">Didn't receive the code?</span>
                {timer > 0 ? (
                  <span className="text-gray-400">Resend in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="font-semibold hover:underline disabled:opacity-60"
                    style={{ color: BRAND_COLOR }}
                  >
                    {isResending ? "Sending..." : "Resend"}
                  </button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}