export const MESSAGE_MAX_LENGTH = 2000;
export const GROUP_NAME_MIN_LENGTH = 2;
export const GROUP_NAME_MAX_LENGTH = 60;
export const GROUP_DESCRIPTION_MAX_LENGTH = 200;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const OTP_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;

export function normalizeText(value: string): string {
  return value.trim();
}

export function validateEmail(value: string): string | null {
  const email = normalizeText(value);
  if (!email) return "Email is required.";
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  }
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address.";
  return null;
}

export function validateName(value: string, label = "Name"): string | null {
  const name = normalizeText(value);
  if (!name) return `${label} is required.`;
  if (name.length < NAME_MIN_LENGTH) {
    return `${label} must be at least ${NAME_MIN_LENGTH} characters.`;
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `${label} must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const phone = normalizeText(value);
  if (!phone) return "Phone number is required.";
  if (phone.length > PHONE_MAX_LENGTH || !PHONE_PATTERN.test(phone)) {
    return "Please enter a valid phone number.";
  }
  return null;
}

export function validatePassword(value: string, isNewPassword = false): string | null {
  if (!value) return "Password is required.";
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (isNewPassword && value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordMatch(password: string, confirmation: string): string | null {
  if (!confirmation) return "Please confirm your password.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

export function validateOtp(value: string): string | null {
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value)) {
    return `Please enter the complete ${OTP_LENGTH}-digit code.`;
  }
  return null;
}

export function validateMessageText(value: string): string | null {
  const text = normalizeText(value);
  if (!text) return "Enter a message first.";
  if (text.length > MESSAGE_MAX_LENGTH) {
    return `Messages must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateGroupName(value: string): string | null {
  const name = normalizeText(value);
  if (!name) return "Group name is required.";
  if (name.length < GROUP_NAME_MIN_LENGTH) {
    return `Group name must be at least ${GROUP_NAME_MIN_LENGTH} characters.`;
  }
  if (name.length > GROUP_NAME_MAX_LENGTH) {
    return `Group name must be ${GROUP_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateGroupDescription(value: string): string | null {
  const description = normalizeText(value);
  if (description.length > GROUP_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${GROUP_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function createTempId(prefix: string): string {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : undefined;
  const unique =
    cryptoApi && typeof cryptoApi.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${unique}`;
}
