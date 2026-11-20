import axiosInstance from "../../../utils/axiosInstance";
import type { MessageAttachment } from "../../../types/types";

export interface UploadResponseData {
  attachments?: MessageAttachment[];
  attachment?: MessageAttachment;
}

interface UploadResponse {
  success?: boolean;
  data?: UploadResponseData;
  message?: string;
}

export function getUploadError(error: unknown, fallback: string): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } }).response;
    const message = response?.data?.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    if (response?.status === 413) {
      return "File is too large. Please choose a smaller file.";
    }
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "ECONNABORTED") {
      return "Upload timed out. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function uploadMultipart(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadResponseData> {
  const response = await axiosInstance.post<UploadResponse>(endpoint, formData, {
    timeout: 120000,
    headers: {
      "Content-Type": undefined,
    },
    onUploadProgress: (event) => {
      const total = event.total;
      if (total && total > 0 && typeof event.loaded === "number" && onProgress) {
        onProgress(Math.min(100, Math.max(0, Math.round((event.loaded / total) * 100))));
      }
    },
  });

  const body = response.data;

  if (!body?.success || !body.data) {
    throw new Error(body?.message || "Upload failed. Please try again.");
  }

  return body.data;
}
