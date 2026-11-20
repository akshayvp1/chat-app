import { FileText, Image as ImageIcon, Music2, Video } from "lucide-react";
import type { ChatMessage, GroupMember, MessageAttachment } from "../../../types/types";

export type MediaMessage = Pick<ChatMessage, "_id" | "senderId" | "createdAt"> & {
  attachments?: MessageAttachment[];
};

export type MediaKind = "image" | "video" | "document" | "audio";

export type MemberLike = GroupMember | { _id: string; name: string; email: string; profile?: string };

export interface ProfileSubject {
  id: string;
  name: string;
  email?: string;
  profile?: string;
  subtitle?: string;
  isGroup?: boolean;
  members?: MemberLike[];
}

export interface ProfileModalProps {
  subject: ProfileSubject;
  messages: MediaMessage[];
  online?: boolean;
  onClose: () => void;
}

export interface MediaItem extends MessageAttachment {
  itemId: string;
  senderId: string;
  createdAt: string;
}

export const tabs: { key: MediaKind; label: string; icon: typeof ImageIcon }[] = [
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Video },
  { key: "document", label: "Documents", icon: FileText },
  { key: "audio", label: "Audio", icon: Music2 },
];

export function getMediaKind(attachment: MessageAttachment): MediaKind {
  const mime = attachment.mimeType ?? "";
  if (attachment.resourceType === "image" || mime.startsWith("image/")) return "image";
  if (attachment.resourceType === "audio" || mime.startsWith("audio/")) return "audio";
  if (attachment.resourceType === "video" || mime.startsWith("video/")) return "video";
  return "document";
}

export function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function flattenMedia(messages: MediaMessage[]): MediaItem[] {
  return messages.flatMap((message) =>
    (message.attachments ?? []).map((attachment, index) => ({
      ...attachment,
      itemId: `${message._id}-${index}`,
      senderId: message.senderId,
      createdAt: message.createdAt,
    }))
  );
}
