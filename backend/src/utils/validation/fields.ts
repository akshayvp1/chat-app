import { RequestError } from "./errors";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, field = "Request body"): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RequestError(`${field} must be an object`);
  }
  return value;
}

export function boundedString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new RequestError(`${field} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new RequestError(`${field} must be between ${min} and ${max} characters`);
  }

  return trimmed;
}

export function normalizeMessageText(value: unknown, hasAttachments: boolean): string {
  if (value === undefined || value === null) {
    if (hasAttachments) return "";
    throw new RequestError("Message text is required");
  }
  return boundedString(value, "Message text", hasAttachments ? 0 : 1, 5000);
}

export function normalizeEmail(value: unknown): string {
  const email = boundedString(value, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestError("Invalid email format");
  }
  return email;
}

export function normalizeName(value: unknown): string {
  const name = boundedString(value, "Name", 2, 50).replace(/\s+/g, " ");
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new RequestError("Name contains invalid characters");
  }
  return name;
}

export function normalizePhone(value: unknown): string {
  const phone = boundedString(value, "Phone", 7, 20).replace(/\s+/g, " ");
  if (!/^\+?[\d\s\-().]+$/.test(phone)) {
    throw new RequestError("Invalid phone number");
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new RequestError("Invalid phone number");
  }

  return phone;
}

export function normalizePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) {
    throw new RequestError("Password must be between 8 and 128 characters");
  }
  return value;
}

export function normalizeLoginPassword(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128) {
    throw new RequestError("Password is required");
  }
  return value;
}

export function normalizeOtp(value: unknown): string {
  const otp =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : "";

  if (!/^\d{6}$/.test(otp)) {
    throw new RequestError("OTP must be 6 digits");
  }

  return otp;
}

export function normalizeResetToken(value: unknown): string {
  const token = boundedString(value, "Reset token", 64, 64);
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    throw new RequestError("Invalid reset token");
  }
  return token;
}
