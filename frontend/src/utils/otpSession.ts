const PENDING_OTP_EMAIL_KEY = "pendingOtpEmail";

export function storePendingOtpEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_OTP_EMAIL_KEY, email);
  } catch {
    return;
  }
}

export function readPendingOtpEmail(): string | null {
  try {
    return sessionStorage.getItem(PENDING_OTP_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function clearPendingOtpEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
  } catch {
    return;
  }
}
