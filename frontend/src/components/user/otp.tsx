import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOtpVerification } from "../../hooks/useOtpVerification";
import { OTP_LENGTH } from "../../utils/validation";
import AppLogo from "./AppLogo";
import OtpInput from "./auth/OtpInput";
import OtpSuccess from "./auth/OtpSuccess";

const BRAND_COLOR = "#8065E8";

export default function Otp() {
  const {
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
  } = useOtpVerification();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EEE9FF] p-4 font-sans dark:bg-[#121117] sm:p-8">
      <Card className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 shadow-[0_24px_70px_rgba(128,101,232,0.18)] dark:border-white/10">
        <CardContent className="p-8 sm:p-9">
          <div className="mb-5 flex justify-center">
            <AppLogo className="h-14" />
          </div>

          {isSuccess ? (
            <OtpSuccess />
          ) : (
            <>
              <p className="mb-2 text-center text-xl font-extrabold text-foreground">
                Verify your email
              </p>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Enter the {OTP_LENGTH}-digit code sent to{" "}
                <span className="font-semibold text-foreground">
                  {email || "your email"}
                </span>
              </p>

              <OtpInput
                digits={digits}
                error={error}
                isLoading={isLoading}
                inputRefs={inputRefs}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />

              {error && (
                <p className="text-xs text-red-500 text-center mb-2">{error}</p>
              )}

              {apiError && (
                <Alert variant="destructive" className="py-2 mb-3">
                  <AlertDescription className="text-xs text-center">
                    {apiError}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => void handleVerify()}
                disabled={isLoading}
                className="w-full rounded-full font-bold"
                style={{
                  backgroundColor: BRAND_COLOR,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-1 text-xs">
                <span className="text-muted-foreground">Didn't receive the code?</span>
                {timer > 0 ? (
                  <span className="text-muted-foreground/70">Resend in {timer}s</span>
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
