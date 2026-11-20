import { useState } from "react";
import { useNavigate} from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppLogo from "./AppLogo";
import PasswordField from "./auth/PasswordField";
import authService from "../../services/user/userAuthService";
import type { ResetPasswordPayload, ValidationErrors } from "../../types/types";
import { useParams } from "react-router-dom";
import {
  PASSWORD_MAX_LENGTH,
  normalizeText,
  validatePassword,
  validatePasswordMatch,
} from "../../utils/validation";


const BRAND_COLOR = "#8065E8";

export default function ResetPassword() {
  const navigate = useNavigate();

  const { token } = useParams();

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(): Promise<void> {
    const newErrors: ValidationErrors = {};
    const passwordError = validatePassword(password, true);
    const confirmationError = validatePasswordMatch(password, confirmPassword);

    if (passwordError) newErrors.password = passwordError;
    if (confirmationError) newErrors.confirmPassword = confirmationError;

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    if (!token) {
      setApiError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setIsLoading(true);
    setApiError("");

    const payload: ResetPasswordPayload = {
      token: normalizeText(token),
      password,
    };
    const result = await authService.resetPassword(payload);

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
                <CheckCircle className="h-8 w-8" style={{ color: BRAND_COLOR }} />
              </div>

              <p className="text-xl font-extrabold text-foreground">Password reset!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been reset successfully. You can now log in with your new password.
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
                  <Lock className="h-7 w-7" style={{ color: BRAND_COLOR }} />
                </div>
                <p className="text-xl font-extrabold text-foreground">Reset password</p>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Enter your new password below.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <PasswordField
                  label="New Password"
                  value={password}
                  error={errors.password}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(value) => {
                    setPassword(value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                />

                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  error={errors.confirmPassword}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                />

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
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
                >
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