import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import type { StatusToastData } from "@/components/ui/StatusToast";
import type { MessageAttachment } from "../types/types";
import type { PendingAttachment } from "../utils/attachments";
import {
  createPendingAttachment,
  revokePendingAttachment,
  revokePendingAttachments,
} from "../utils/attachments";
import { validateComposerFiles } from "../utils/messageComposer";
import uploadService from "../services/user/uploadService";

export interface UploadTarget {
  kind: "direct" | "group";
  receiverId?: string;
  groupId?: string;
}

export function useMessageAttachments() {
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [attachmentToRemove, setAttachmentToRemove] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<StatusToastData | null>(null);

  const pendingFilesRef = useRef<PendingAttachment[]>([]);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      revokePendingAttachments(pendingFilesRef.current);
      pendingFilesRef.current = [];
    };
  }, []);

  function clearPendingAttachments() {
    revokePendingAttachments(pendingFiles);
    pendingFilesRef.current = [];
    setPendingFiles([]);
    setUploadError("");
    setUploadProgress({});
  }

  function resetAttachments() {
    revokePendingAttachments(pendingFilesRef.current);
    pendingFilesRef.current = [];
    setPendingFiles([]);
    setUploadError("");
    setUploadProgress({});
  }

  function handleFilesSelected(files: File[]) {
    if (files.length === 0) return;

    const validationError = validateComposerFiles(
      uploadService.validateMessageFiles,
      pendingFiles,
      files,
    );

    if (validationError) {
      setUploadError(validationError);
      setToast({ kind: "warning", message: validationError });
      return;
    }

    setUploadError("");
    setPendingFiles((prev) => [
      ...prev,
      ...files.map(createPendingAttachment),
    ]);
  }

  function removePendingAttachment(id: string) {
    const targetAttachment = pendingFiles.find((item) => item.id === id);

    if (targetAttachment) {
      revokePendingAttachment(targetAttachment);
    }

    setPendingFiles((prev) => prev.filter((item) => item.id !== id));
    setUploadError("");
  }

  function requestRemoveAttachment(id: string) {
    if (uploading) return;
    setAttachmentToRemove(id);
  }

  async function uploadPendingFiles(
    target: UploadTarget,
  ): Promise<MessageAttachment[] | null> {
    if (pendingFiles.length === 0) {
      return [];
    }

    setUploading(true);

    try {
      const attachments = await uploadService.uploadMessageFiles(
        pendingFiles.map((item) => item.file),
        target.kind === "direct"
          ? { receiverId: target.receiverId ?? "" }
          : { groupId: target.groupId ?? "" },
        (index, percent) => {
          const targetFile = pendingFiles[index];
          if (!targetFile) return;
          setUploadProgress((prev) => ({
            ...prev,
            [targetFile.id]: percent,
          }));
        },
      );

      setUploading(false);
      return attachments;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not upload attachments.";
      setUploadError(message);
      setToast({ kind: "error", message });
      setUploading(false);
      return null;
    }
  }

  return {
    pendingFiles,
    uploading,
    uploadError,
    uploadProgress,
    attachmentToRemove,
    setAttachmentToRemove: setAttachmentToRemove as Dispatch<
      SetStateAction<string | null>
    >,
    toast,
    setToast: setToast as Dispatch<SetStateAction<StatusToastData | null>>,
    handleFilesSelected,
    removePendingAttachment,
    requestRemoveAttachment,
    clearPendingAttachments,
    resetAttachments,
    uploadPendingFiles,
  };
}