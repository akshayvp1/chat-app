import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import authService from "../../services/user/userAuthService";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  loginSuccess,
  storePendingUser,
} from "../../redux/slices/authSlice";

import type {
  AuthMode,
  ValidationErrors,
  InputFieldProps,
  PasswordFieldProps,
  RegisterPayload,
  LoginPayload,
} from "../../types/types";

const BRAND_COLOR = "#5b7cfa";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-(). ]{7,15}$/.test(phone);
}

function InputField({ label, type, icon, value, error, onChange }: InputFieldProps) {
  const Icon = icon === "user" ? User : icon === "mail" ? Mail : Phone;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">{label}</Label>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`pr-9 bg-slate-50 ${error ? "border-red-500 bg-red-50" : ""}`}
        />
        <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordField({ label, value, error, onChange }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
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

export default function SignIn() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

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

  async function handleLoginSubmit() {
    const newErrors: ValidationErrors = {};
    if (!loginEmail.trim()) newErrors.loginEmail = "Email is required.";
    else if (!isValidEmail(loginEmail)) newErrors.loginEmail = "Invalid email.";
    if (!loginPassword) newErrors.loginPassword = "Password is required.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setIsLoading(true);
    setApiError("");

    const payload: LoginPayload = { email: loginEmail, password: loginPassword };
    const result = await authService.login(payload);

    if (result.success) {
      // localStorage.setItem("accessToken", result.data.accessToken);
      // localStorage.setItem("refreshToken", result.data.refreshToken);

      dispatch(
        loginSuccess({
          user: result.data.user,
        })
      );

      navigate("/chat");
    } else {
      setApiError(result.message);
    }

    setIsLoading(false);
  }

  async function handleRegisterSubmit() {
    const newErrors: ValidationErrors = {};
    if (!registerName.trim()) newErrors.registerName = "Required.";
    if (!registerEmail) newErrors.registerEmail = "Required.";
    else if (!isValidEmail(registerEmail)) newErrors.registerEmail = "Invalid email.";
    if (!registerPhone) newErrors.registerPhone = "Required.";
    else if (!isValidPhone(registerPhone)) newErrors.registerPhone = "Invalid number.";
    if (!registerPassword) newErrors.registerPassword = "Required.";
    else if (registerPassword.length < 8) newErrors.registerPassword = "Min. 8 characters.";
    if (!confirmPassword) newErrors.confirmPassword = "Required.";
    else if (registerPassword !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setIsLoading(true);
    setApiError("");

    const payload: RegisterPayload = {
      name: registerName,
      email: registerEmail,
      phone: registerPhone,
      password: registerPassword,
    };
    const result = await authService.register(payload);

   if (result.success && result.data?.user) {
  dispatch(
    storePendingUser(result.data.user)
  );

  navigate("/verify-otp");
} else {
  setApiError(result.message);
}

    setIsLoading(false);
  }

  function resetSuccessState() {
    setIsSuccess(false);
    setErrors({});
    setApiError("");
  }

  const isLoginMode = mode === "login";

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50 p-4 sm:p-8 font-sans">
      <Card className="flex w-full max-w-3xl min-h-[460px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200/60 p-0 flex-col sm:flex-row">

        {/* Left brand panel */}
        <div
          className="relative flex flex-col items-center justify-center text-center px-8 py-10 sm:w-[42%] shrink-0 overflow-hidden"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10" />

          <p className="relative z-10 text-xl font-extrabold text-white mb-2">
            {isLoginMode ? "Hello, Welcome!" : "Welcome Back!"}
          </p>
          <p className="relative z-10 text-sm text-white/80 mb-6">
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Button
            variant="outline"
            onClick={toggleMode}
            className="relative z-10 border-2 border-white bg-transparent text-white hover:bg-white hover:text-indigo-600 rounded-full px-7"
          >
            {isLoginMode ? "Register" : "Login"}
          </Button>
        </div>

        {/* Right form panel */}
        <CardContent className="flex-1 flex flex-col justify-center p-8 sm:p-9">
          {isSuccess ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke={BRAND_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-lg font-extrabold text-slate-900">
                {isLoginMode ? "Welcome back!" : "Account created!"}
              </p>
              <p className="text-sm text-gray-500">
                {isLoginMode ? "Redirecting to dashboard..." : "Your account has been registered."}
              </p>
              <Button
                onClick={resetSuccessState}
                className="mt-2 rounded-full px-7"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Back
              </Button>
            </div>
          ) : isLoginMode ? (
            <>
              <p className="text-xl font-extrabold text-slate-900 mb-5 text-center">Login</p>
              <div className="flex flex-col gap-3">
                <InputField
                  label="Email"
                  type="email"
                  icon="mail"
                  value={loginEmail}
                  error={errors.loginEmail}
                  onChange={setLoginEmail}
                />
                <PasswordField
                  label="Password"
                  value={loginPassword}
                  error={errors.loginPassword}
                  onChange={setLoginPassword}
                />
                {apiError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs text-center">{apiError}</AlertDescription>
                  </Alert>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="self-end -mt-1.5 text-xs font-medium hover:underline"
                  style={{ color: BRAND_COLOR }}
                >
                  Forgot password?
                </button>
                <Button
                  onClick={handleLoginSubmit}
                  disabled={isLoading}
                  className="w-full rounded-full font-bold"
                  style={{ backgroundColor: BRAND_COLOR, opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <div className="flex items-center gap-2.5 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    or login with social platforms
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="flex justify-center gap-2.5">
                  {["G", "f", "⊕", "in"].map((label) => (
                    <Button
                      key={label}
                      variant="outline"
                      className="w-9 h-9 p-0 rounded-lg text-sm font-bold text-slate-600"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-extrabold text-slate-900 mb-5 text-center">Registration</p>
              <div className="flex flex-col gap-3">
                <InputField
                  label="Name"
                  type="text"
                  icon="user"
                  value={registerName}
                  error={errors.registerName}
                  onChange={setRegisterName}
                />
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <InputField
                      label="Email"
                      type="email"
                      icon="mail"
                      value={registerEmail}
                      error={errors.registerEmail}
                      onChange={setRegisterEmail}
                    />
                  </div>
                  <div className="flex-1">
                    <InputField
                      label="Phone"
                      type="tel"
                      icon="phone"
                      value={registerPhone}
                      error={errors.registerPhone}
                      onChange={setRegisterPhone}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <PasswordField
                      label="Password"
                      value={registerPassword}
                      error={errors.registerPassword}
                      onChange={setRegisterPassword}
                    />
                  </div>
                  <div className="flex-1">
                    <PasswordField
                      label="Confirm Password"
                      value={confirmPassword}
                      error={errors.confirmPassword}
                      onChange={setConfirmPassword}
                    />
                  </div>
                </div>
                {apiError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs text-center">{apiError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={handleRegisterSubmit}
                  disabled={isLoading}
                  className="w-full rounded-full font-bold"
                  style={{ backgroundColor: BRAND_COLOR, opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}