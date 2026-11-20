import { Download, FileText } from "lucide-react";
import type { MessageAttachment } from "../../types/types";
import { resolveFileUrl } from "../../utils/axiosInstance";

interface AttachmentGalleryProps {
  attachments?: MessageAttachment[];
  outgoing?: boolean;
}

function getKind(attachment: MessageAttachment): "image" | "video" | "audio" | "raw" {
  const mimeType = attachment.mimeType ?? "";
  if (attachment.resourceType === "image" || mimeType.startsWith("image/")) return "image";
  if (attachment.resourceType === "audio" || mimeType.startsWith("audio/")) return "audio";
  if (attachment.resourceType === "video" || mimeType.startsWith("video/")) return "video";
  return "raw";
}

export default function AttachmentGallery({ attachments, outgoing = false }: AttachmentGalleryProps) {
  if (!attachments || attachments.length === 0) return null;

  const thumbnailBorder = outgoing
    ? "border-white/25"
    : "border-border/70 bg-muted/40";

  return (
    <div className="mt-2 flex min-w-0 flex-col gap-2">
      {attachments.map((attachment, index) => {
        const kind = getKind(attachment);
        const key = `${attachment.publicId || attachment.url}-${index}`;
        const fileUrl = resolveFileUrl(attachment.url);

        if (kind === "image") {
          return (
            <a
              key={key}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-fit max-w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              title={attachment.fileName || "Open attached image"}
              aria-label={attachment.fileName || "Open attached image"}
            >
              <img
                src={fileUrl}
                alt={attachment.fileName || "Attached image"}
                className={`max-h-48 max-w-full rounded-xl border object-cover shadow-sm ${thumbnailBorder}`}
              />
            </a>
          );
        }

        if (kind === "video") {
          return (
            <video
              key={key}
              src={fileUrl}
              controls
              className={`max-h-56 w-full max-w-full rounded-xl border bg-black shadow-sm sm:max-w-xs ${thumbnailBorder}`}
              aria-label={attachment.fileName || "Attached video"}
            />
          );
        }

        if (kind === "audio") {
          return (
            <audio
              key={key}
              src={fileUrl}
              controls
              className={`w-full max-w-full rounded-xl border bg-muted/40 sm:max-w-xs ${thumbnailBorder}`}
              aria-label={attachment.fileName || "Attached audio"}
            />
          );
        }

        return (
          <a
            key={key}
            href={fileUrl}
            download={attachment.fileName || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              outgoing
                ? "border-white/20 bg-white/15 text-white hover:bg-white/25"
                : "border-border bg-muted/60 text-foreground hover:bg-muted"
            }`}
            title={attachment.fileName || "Download attachment"}
            aria-label={attachment.fileName || "Download attachment"}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{attachment.fileName || "Attachment"}</span>
            <Download className="h-4 w-4 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}
