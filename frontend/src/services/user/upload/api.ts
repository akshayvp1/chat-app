import axiosInstance from "../../../utils/axiosInstance";
import type {
  MessageAttachment,
  ProfileUpdateResponse,
  UploadIntent,
  User,
} from "../../../types/types";
import type { UploadProgressCallback, UploadTarget } from "./constants";
import { getUploadError, uploadMultipart } from "./client";
import {
  validateMessageFile,
  validateMessageFiles,
  validateProfileImage,
} from "./validation";

export async function uploadFile(
  file: File,
  intent: UploadIntent,
  onProgress?: (percent: number) => void
): Promise<MessageAttachment> {
  const validationError = intent === "profile" ? validateProfileImage(file) : validateMessageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  try {
    if (intent === "profile") {
      const formData = new FormData();
      formData.append("file", file);

      const data = await uploadMultipart("/upload/profile", formData, onProgress);
      const attachment = data.attachment ?? data.attachments?.[0];

      if (!attachment) {
        throw new Error("Upload did not return a valid file.");
      }

      return attachment;
    }

    throw new Error("A recipient or group is required for message file uploads.");
  } catch (error) {
    throw new Error(getUploadError(error, "Could not upload the file. Please try again."), {
      cause: error,
    });
  }
}

export async function uploadMessageFiles(
  files: File[],
  target: UploadTarget,
  onProgress?: UploadProgressCallback
): Promise<MessageAttachment[]> {
  const validationError = validateMessageFiles(files);

  if (validationError) {
    throw new Error(validationError);
  }

  const receiverId = target.receiverId?.trim();
  const groupId = target.groupId?.trim();

  if (!receiverId && !groupId) {
    throw new Error("A recipient or group is required for file uploads.");
  }

  try {
    return await Promise.all(
      files.map((file, index) => {
        const formData = new FormData();

        if (receiverId) formData.append("receiverId", receiverId);
        if (groupId) formData.append("groupId", groupId);
        formData.append("files", file);

        return uploadMultipart("/upload/message", formData, (percent) =>
          onProgress?.(index, percent)
        ).then((data) => {
          const attachment = data.attachments?.[0];

          if (!attachment) {
            throw new Error("Upload did not return a valid file.");
          }

          return attachment;
        });
      })
    );
  } catch (error) {
    throw new Error(getUploadError(error, "Could not upload attachments. Please try again."), {
      cause: error,
    });
  }
}

export interface ProfileChanges {
  name?: string;
  bio?: string;
  profile?: string;
}

export async function updateProfile(changes: ProfileChanges): Promise<User | undefined> {
  const response = await axiosInstance.put<ProfileUpdateResponse>("/user/profile", changes);

  if (!response.data?.success) {
    throw new Error("Could not save your profile.");
  }

  return response.data.user;
}

export async function updateProfilePicture(profileUrl: string): Promise<User | undefined> {
  if (!profileUrl || typeof profileUrl !== "string") {
    throw new Error("Invalid profile image URL.");
  }

  return updateProfile({ profile: profileUrl });
}
