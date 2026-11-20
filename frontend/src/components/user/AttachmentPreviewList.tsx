import { FileText, Music, Video, X } from "lucide-react";
import type { PendingAttachment } from "../../utils/attachments";

interface AttachmentPreviewListProps {
  attachments: PendingAttachment[];
  uploading: boolean;
  onRemove: (id: string) => void;
  progressByFileId?: Record<string, number>;
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KB`;
  return `${size}B`;
}

export default function AttachmentPreviewList({
  attachments,
  uploading,
  onRemove,
  progressByFileId,
}: AttachmentPreviewListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex max-w-full flex-wrap gap-2">
      {attachments.map((attachment) => {
        const isImage = attachment.file.type.startsWith("image/");
        const isVideo = attachment.file.type.startsWith("video/");
        const isAudio = attachment.file.type.startsWith("audio/");
        const progress = progressByFileId?.[attachment.id];

        return (
          <div
            key={attachment.id}
            className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-muted/60 py-1.5 pl-1.5 pr-2"
          >
            {isImage && attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="h-10 w-10 shrink-0 rounded-lg border border-border/60 object-cover"
              />
            ) : isVideo && attachment.previewUrl ? (
              <video
                src={attachment.previewUrl}
                controls
                muted
                className="h-10 w-10 shrink-0 rounded-lg border border-border/60 object-cover"
              />
            ) : isAudio && attachment.previewUrl ? (
              <audio
                src={attachment.previewUrl}
                controls
                preload="metadata"
                className="h-8 w-28 shrink-0 sm:w-36"
                aria-label={`Preview ${attachment.file.name}`}
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEE9FF] dark:bg-[#8065E8]/20">
                {isVideo ? (
                  <Video className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
                ) : isAudio ? (
                  <Music className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
                ) : (
                  <FileText className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
                )}
              </div>
            )}

            <div className="min-w-0 max-w-24 sm:max-w-36">
              <p className="truncate text-[11px] font-semibold text-foreground" title={attachment.file.name}>
                {attachment.file.name}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {uploading && progress !== undefined
                  ? `${progress}% · ${formatSize(attachment.file.size)}`
                  : formatSize(attachment.file.size)}
              </p>
              {uploading && progress !== undefined && (
                <div
                  className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${attachment.file.name}`}
                >
                  <div
                    className="h-full rounded-full bg-[#8065E8] transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              disabled={uploading}
              aria-label={`Remove ${attachment.file.name}`}
              title={`Remove ${attachment.file.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
