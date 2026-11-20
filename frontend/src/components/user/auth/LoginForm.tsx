import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import authService from "@/services/user/userAuthService";
import type { LoginPayload, User, ValidationErrors } from "../../../types/types";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  normalizeText,
  validateEmail,
  validatePassword,
} from "../../../utils/validation";
import InputField from "./InputField";
import PasswordField from "./PasswordField";

const BRAND_COLOR = "#8065E8";

interface LoginFormProps {
  email: string;
  password: string;
  errors: ValidationErrors;
  apiError: string;
  isLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onErrorsChange: (errors: ValidationErrors) => void;
  onApiErrorChange: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onSuccess: (user: User) => void;
  onForgotPassword: () => void;
}

export default function LoginForm({
  email,
  password,
  errors,
  apiError,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onErrorsChange,
  onApiErrorChange,
  onLoadingChange,
  onSuccess,
  onForgotPassword,
}: LoginFormProps) {
  async function handleSubmit() {
    const newErrors: ValidationErrors = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError) newErrors.loginEmail = emailError;
    if (passwordError) newErrors.loginPassword = passwordError;

    onErrorsChange(newErrors);
    if (Object.keys(newErrors).length) return;

    onLoadingChange(true);
    onApiErrorChange("");

    const payload: LoginPayload = {
      email: normalizeText(email),
      password,
    };
    const result = await authService.login(payload);

    if (result.success) {
      onSuccess(result.data.user);
    } else {
      onApiErrorChange(result.message);
    }

    onLoadingChange(false);
  }

  return (
    <>
      <p className="text-xl font-extrabold text-foreground mb-5 text-center">Login</p>
      <div className="flex flex-col gap-3">
        <InputField
          label="Email"
          type="email"
          icon="mail"
          value={email}
          error={errors.loginEmail}
          maxLength={EMAIL_MAX_LENGTH}
          onChange={onEmailChange}
        />
        <PasswordField
          label="Password"
          value={password}
          error={errors.loginPassword}
          maxLength={PASSWORD_MAX_LENGTH}
          onChange={onPasswordChange}
        />
        {apiError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs text-center">{apiError}</AlertDescription>
          </Alert>
        )}
        <button
          type="button"
          onClick={onForgotPassword}
          className="self-end -mt-1.5 text-xs font-medium hover:underline"
          style={{ color: BRAND_COLOR }}
        >
          Forgot password?
        </button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full rounded-full font-bold"
          style={{ backgroundColor: BRAND_COLOR, opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>

        <div className="flex items-center gap-2.5 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            or login with social platforms
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex justify-center gap-2.5">
          {["G", "f", "⊕", "in"].map((label) => (
            <Button
              key={label}
              variant="outline"
              className="w-9 h-9 p-0 rounded-lg text-sm font-bold text-foreground"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
