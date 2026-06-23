import React, { useState } from "react";
import { useNavigate} from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import authService from "../../services/user/userAuthService";
import type { ResetPasswordPayload, ValidationErrors } from "../../types/types";
import { useParams } from "react-router-dom";


const BRAND_COLOR = "#5b7cfa";

function PasswordField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">{label}</Label>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`pr-9 bg-slate-50 ${error ? "border-red-500 bg-red-50" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label="Toggle password visibility"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const { token } = useParams();

  console.log("Token:", token);

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(): Promise<void> {
    const newErrors: ValidationErrors = {};

    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 8) newErrors.password = "Min. 8 characters.";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    if (!token) {
      setApiError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setIsLoading(true);
    setApiError("");

    const payload: ResetPasswordPayload = { token, password };
    const result = await authService.resetPassword(payload);

    if (result.success) {
      setIsSuccess(true);
    } else {
      setApiError(result.message);
    }

    setIsLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50 p-4 sm:p-8 font-sans">
      <Card className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200/60">
        <CardContent className="p-8 sm:p-10">
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">

              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-100">
                <CheckCircle className="h-8 w-8" style={{ color: BRAND_COLOR }} />
              </div>

              <p className="text-xl font-extrabold text-slate-900">Password reset!</p>
              <p className="text-sm text-gray-500 leading-relaxed">
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
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-indigo-100">
                  <Lock className="h-7 w-7" style={{ color: BRAND_COLOR }} />
                </div>
                <p className="text-xl font-extrabold text-slate-900">Reset password</p>
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  Enter your new password below.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <PasswordField
                  label="New Password"
                  value={password}
                  error={errors.password}
                  onChange={(value) => {
                    setPassword(value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                />

                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  error={errors.confirmPassword}
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
                  className="text-xs font-medium text-gray-500 hover:text-slate-800 transition-colors text-center"
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