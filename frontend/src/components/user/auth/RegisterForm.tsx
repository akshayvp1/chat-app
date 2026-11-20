import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import authService from "@/services/user/userAuthService";
import type { RegisterPayload, User, ValidationErrors } from "../../../types/types";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  normalizeText,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
} from "../../../utils/validation";
import InputField from "./InputField";
import PasswordField from "./PasswordField";

const BRAND_COLOR = "#8065E8";

interface RegisterFormProps {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  errors: ValidationErrors;
  apiError: string;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onErrorsChange: (errors: ValidationErrors) => void;
  onApiErrorChange: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onSuccess: (user: User, email: string) => void;
}

export default function RegisterForm({
  name,
  email,
  phone,
  password,
  confirmPassword,
  errors,
  apiError,
  isLoading,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onErrorsChange,
  onApiErrorChange,
  onLoadingChange,
  onSuccess,
}: RegisterFormProps) {
  async function handleSubmit() {
    const newErrors: ValidationErrors = {};
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);
    const passwordError = validatePassword(password, true);
    const confirmationError = validatePasswordMatch(password, confirmPassword);

    if (nameError) newErrors.registerName = nameError;
    if (emailError) newErrors.registerEmail = emailError;
    if (phoneError) newErrors.registerPhone = phoneError;
    if (passwordError) newErrors.registerPassword = passwordError;
    if (confirmationError) newErrors.confirmPassword = confirmationError;

    onErrorsChange(newErrors);
    if (Object.keys(newErrors).length) return;

    onLoadingChange(true);
    onApiErrorChange("");

    const trimmedEmail = normalizeText(email);
    const payload: RegisterPayload = {
      name: normalizeText(name),
      email: trimmedEmail,
      phone: normalizeText(phone),
      password,
    };
    const result = await authService.register(payload);

    if (result.success && result.data?.user) {
      onSuccess(result.data.user, trimmedEmail);
    } else {
      onApiErrorChange(result.message);
    }

    onLoadingChange(false);
  }

  return (
    <>
      <p className="text-xl font-extrabold text-foreground mb-5 text-center">Registration</p>
      <div className="flex flex-col gap-3">
        <InputField
          label="Name"
          type="text"
          icon="user"
          value={name}
          error={errors.registerName}
          maxLength={NAME_MAX_LENGTH}
          onChange={onNameChange}
        />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <InputField
              label="Email"
              type="email"
              icon="mail"
              value={email}
              error={errors.registerEmail}
              maxLength={EMAIL_MAX_LENGTH}
              onChange={onEmailChange}
            />
          </div>
          <div className="flex-1">
            <InputField
              label="Phone"
              type="tel"
              icon="phone"
              value={phone}
              error={errors.registerPhone}
              maxLength={PHONE_MAX_LENGTH}
              onChange={onPhoneChange}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <PasswordField
              label="Password"
              value={password}
              error={errors.registerPassword}
              maxLength={PASSWORD_MAX_LENGTH}
              onChange={onPasswordChange}
            />
          </div>
          <div className="flex-1">
            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              error={errors.confirmPassword}
              maxLength={PASSWORD_MAX_LENGTH}
              onChange={onConfirmPasswordChange}
            />
          </div>
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
          {isLoading ? "Registering..." : "Register"}
        </Button>
      </div>
    </>
  );
}
