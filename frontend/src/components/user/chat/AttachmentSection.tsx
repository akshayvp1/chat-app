import AttachmentPreviewList from "../AttachmentPreviewList";
import type { PendingAttachment } from "../../../utils/attachments";

interface AttachmentSectionProps {
  attachments: PendingAttachment[];
  uploading: boolean;
  uploadError: string;
  progressByFileId: Record<string, number>;
  onRemove: (id: string) => void;
}

export default function AttachmentSection({
  attachments,
  uploading,
  uploadError,
  progressByFileId,
  onRemove,
}: AttachmentSectionProps) {
  return (
    <>
      <AttachmentPreviewList
        attachments={attachments}
        uploading={uploading}
        onRemove={onRemove}
        progressByFileId={progressByFileId}
      />

      {uploadError && (
        <p
          className="mb-2 text-xs font-medium text-red-500 dark:text-red-400"
          role="alert"
        >
          {uploadError}
        </p>
      )}
    </>
  );
}
