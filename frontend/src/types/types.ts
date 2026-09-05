export type AuthMode = "login" | "register";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export interface ValidationErrors {
  [field: string]: string;
}

export interface InputFieldProps {
  label: string;
  type: string;
  icon: "user" | "mail" | "phone";
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export interface PasswordFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface OtpVerifyPayload {
  email: string;
  otp: string;
}

export interface OtpResendPayload {
  email: string;
}

export interface VerifyOtpResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  _id: string;
  tempId?: string;
  senderId: string;
  receiverId: string;
  text: string;
  seen: boolean;
  createdAt: string;
  updatedAt?: string;
  status?: "sending" | "sent" | "error";
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

export interface UserList {
  _id: string;
  name: string;
  email: string;
  lastSeen?: string | null;
}

export interface LogoutResponse {
  message: string;
}

// kept for backward compat if used elsewhere
export interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  time: string;
  seen: boolean;
}




export interface GroupMember {
  _id: string;
  name: string;
  email: string;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  admin: string;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupMessage {
  _id: string;
  tempId?: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  seenBy: string[];
  createdAt: string;
  status?: "sending" | "sent" | "error";
}