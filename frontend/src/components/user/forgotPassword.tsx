import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppLogo from "./AppLogo";
import authService from "../../services/user/userAuthService";
import type { ForgotPasswordPayload } from "../../types/types";
import { EMAIL_MAX_LENGTH, normalizeText, validateEmail } from "../../utils/validation";

const BRAND_COLOR = "#8065E8";

export default function Forgot() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(): Promise<void> {
    setEmailError("");
    setApiError("");

    const emailError = validateEmail(email);
    if (emailError) {
      setEmailError(emailError);
      return;
    }

    setIsLoading(true);

    const payload: ForgotPasswordPayload = { email: normalizeText(email) };
    const result = await authService.forgotPassword(payload);

    if (result.success) {
      setIsSuccess(true);
    } else {
      setApiError(result.message);
    }

    setIsLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EEE9FF] p-4 font-sans dark:bg-[#121117] sm:p-8">
      <Card className="w-full max-w-md rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(128,101,232,0.18)]">
        <CardContent className="p-8 sm:p-10">
          <div className="mb-5 flex justify-center">
            <AppLogo className="h-12" />
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">

              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EEE9FF] dark:bg-[#8065E8]/20">
                <Mail className="h-8 w-8" style={{ color: BRAND_COLOR }} />
              </div>

              <p className="text-xl font-extrabold text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've sent a password reset link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Please check your inbox and follow the instructions.
              </p>

              <p className="text-xs text-muted-foreground/70">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => { setIsSuccess(false); setEmail(""); }}
                  className="font-semibold hover:underline"
                  style={{ color: BRAND_COLOR }}
                >
                  try again
                </button>
                .
              </p>

              <Button
                onClick={() => navigate("/login")}
                className="w-full rounded-full font-bold mt-2"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#EEE9FF] dark:bg-[#8065E8]/20">
                  <Mail className="h-7 w-7" style={{ color: BRAND_COLOR }} />
                </div>
                <p className="text-xl font-extrabold text-foreground">Forgot password?</p>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="you@example.com"
                      maxLength={EMAIL_MAX_LENGTH}
                      className={`pr-9 bg-muted/60 ${emailError ? "border-red-500 bg-red-50" : ""}`}
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                  </div>
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>

                {apiError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs text-center">{apiError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full rounded-full font-bold"
                  style={{ backgroundColor: BRAND_COLOR, opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Login
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}