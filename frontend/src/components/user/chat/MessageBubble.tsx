import { BRAND_COLOR } from "../../../constants/brand";
import type {
  MessageAttachment,
  MessageDeliveryStatus,
} from "../../../types/types";
import AttachmentGallery from "../AttachmentGallery";
import Avatar from "../Avatar";
import MessageStatus from "../MessageStatus";

interface MessageBubbleProps {
  isMe: boolean;
  text: string;
  createdAt: string;
  attachments?: MessageAttachment[];
  status?: MessageDeliveryStatus;
  senderName?: string;
  senderColor?: string;
  avatarName?: string;
  avatarSrc?: string;
  avatarColor?: string;
}

export default function MessageBubble({
  isMe,
  text,
  createdAt,
  attachments,
  status,
  senderName,
  senderColor,
  avatarName,
  avatarSrc,
  avatarColor,
}: MessageBubbleProps) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && avatarName !== undefined && (
        <div className="mr-1.5 mt-auto sm:mr-2">
          <Avatar
            name={avatarName}
            src={avatarSrc}
            size="sm"
            color={avatarColor}
          />
        </div>
      )}

      <div
        className={`min-w-0 max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[70%] sm:px-4 ${
          isMe
            ? "rounded-br-sm text-white shadow-sm"
            : "rounded-bl-sm border border-border bg-card text-card-foreground shadow-sm dark:border-border"
        } ${
          status === "error" ? "opacity-60 ring-1 ring-destructive/40" : ""
        }`}
        style={isMe ? { backgroundColor: BRAND_COLOR } : {}}
      >
        {!isMe && senderName !== undefined && (
          <p
            className="mb-1 break-words text-[11px] font-semibold"
            style={{ color: senderColor }}
          >
            {senderName}
          </p>
        )}

        <p className="break-words">{text}</p>

        <AttachmentGallery attachments={attachments} outgoing={isMe} />

        <div
          className={`mt-1 flex items-center gap-1 ${
            isMe ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] tabular-nums ${
              isMe ? "text-white/80" : "text-muted-foreground"
            }`}
          >
            {new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isMe && <MessageStatus status={status} />}

          {status === "error" && (
            <span className="ml-1 text-[10px] font-semibold text-red-100 dark:text-red-200">
              Failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
