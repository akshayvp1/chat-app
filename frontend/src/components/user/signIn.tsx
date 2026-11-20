import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAppDispatch } from "../../redux/hooks";
import { loginSuccess, storePendingUser } from "../../redux/slices/authSlice";
import { storePendingOtpEmail } from "../../utils/otpSession";
import type { AuthMode, User, ValidationErrors } from "../../types/types";
import AuthSuccess from "./auth/AuthSuccess";
import BrandPanel from "./auth/BrandPanel";
import LoginForm from "./auth/LoginForm";
import RegisterForm from "./auth/RegisterForm";

export default function SignIn() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function toggleMode() {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setErrors({});
    setIsSuccess(false);
    setApiError("");
  }

  function handleAuthenticated(user: User) {
    dispatch(loginSuccess({ user }));
    navigate("/chat");
  }

  function handleRegistered(user: User, email: string) {
    storePendingOtpEmail(email);
    dispatch(storePendingUser(user));
    navigate("/verify-otp");
  }

  function resetSuccessState() {
    setIsSuccess(false);
    setErrors({});
    setApiError("");
  }

  const isLoginMode = mode === "login";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EEE9FF] p-4 font-sans dark:bg-[#121117] sm:p-8">
      <Card className="flex w-full max-w-3xl min-h-[460px] rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(128,101,232,0.18)] p-0 flex-col sm:flex-row">
        <BrandPanel isLoginMode={isLoginMode} onToggleMode={toggleMode} />
        <CardContent className="flex-1 flex flex-col justify-center p-8 sm:p-9">
          {isSuccess ? (
            <AuthSuccess isLoginMode={isLoginMode} onBack={resetSuccessState} />
          ) : isLoginMode ? (
            <LoginForm
              email={loginEmail}
              password={loginPassword}
              errors={errors}
              apiError={apiError}
              isLoading={isLoading}
              onEmailChange={setLoginEmail}
              onPasswordChange={setLoginPassword}
              onErrorsChange={setErrors}
              onApiErrorChange={setApiError}
              onLoadingChange={setIsLoading}
              onSuccess={handleAuthenticated}
              onForgotPassword={() => navigate("/forgot-password")}
            />
          ) : (
            <RegisterForm
              name={registerName}
              email={registerEmail}
              phone={registerPhone}
              password={registerPassword}
              confirmPassword={confirmPassword}
              errors={errors}
              apiError={apiError}
              isLoading={isLoading}
              onNameChange={setRegisterName}
              onEmailChange={setRegisterEmail}
              onPhoneChange={setRegisterPhone}
              onPasswordChange={setRegisterPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onErrorsChange={setErrors}
              onApiErrorChange={setApiError}
              onLoadingChange={setIsLoading}
              onSuccess={handleRegistered}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
