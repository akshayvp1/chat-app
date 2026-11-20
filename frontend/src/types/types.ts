export type AuthMode = "login" | "register";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profile?: string;
  bio?: string;
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
  maxLength?: number;
  onChange: (value: string) => void;
}

export interface PasswordFieldProps {
  label: string;
  value: string;
  error?: string;
  maxLength?: number;
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

export type MessageKind = "text" | "call";

export interface CallInfo {
  callType: "audio" | "video";
  status: "completed" | "missed" | "rejected";
  duration: number;
}

export type MessageDeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "error";

export type UploadIntent = "message" | "profile";

export type AttachmentResourceType = "image" | "video" | "audio" | "raw";

export interface MessageAttachment {
  url: string;
  publicId: string;
  resourceType: AttachmentResourceType;
  mimeType: string;
  fileName: string;
  size: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ProfileUpdateResponse {
  success: boolean;
  user?: User;
}

export interface ChatMessage {
  _id: string;
  tempId?: string;
  senderId: string;
  receiverId: string;
  text: string;
  type?: MessageKind;
  call?: CallInfo;
  attachments?: MessageAttachment[];
  seen: boolean;
  createdAt: string;
  updatedAt?: string;
  status?: MessageDeliveryStatus;
}

export interface UserList {
  _id: string;
  name: string;
  email: string;
  profile?: string;
  lastSeen?: string | null;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface GroupMember {
  _id: string;
  name: string;
  email: string;
  profile?: string;
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

export type GroupMessageKind = "text" | "call";

export interface GroupCallInfo {
  callType: "audio" | "video";
  status: "completed" | "missed";
  duration: number;
  participantCount: number;
}

export interface GroupMessage {
  _id: string;
  tempId?: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  type?: GroupMessageKind;
  call?: GroupCallInfo;
  attachments?: MessageAttachment[];
  seenBy: string[];
  createdAt: string;
  status?: MessageDeliveryStatus;
}