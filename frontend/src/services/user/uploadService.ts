import { uploadFile, uploadMessageFiles, updateProfile, updateProfilePicture } from "./upload/api";
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_ACCEPT,
  PROFILE_ACCEPT,
} from "./upload/constants";
import {
  validateMessageFile,
  validateMessageFiles,
  validateProfileImage,
} from "./upload/validation";

export type { ProfileChanges } from "./upload/api";
export type {
  AttachmentCategory,
  UploadProgressCallback,
  UploadTarget,
} from "./upload/constants";
export {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_ACCEPT,
  PROFILE_ACCEPT,
} from "./upload/constants";
export {
  validateMessageFile,
  validateMessageFiles,
  validateProfileImage,
} from "./upload/validation";
export { uploadFile, uploadMessageFiles, updateProfile, updateProfilePicture } from "./upload/api";

const uploadService = {
  uploadFile,
  uploadMessageFiles,
  updateProfile,
  updateProfilePicture,
  validateProfileImage,
  validateMessageFile,
  validateMessageFiles,
  MAX_ATTACHMENTS_PER_MESSAGE,
  PROFILE_ACCEPT,
  MESSAGE_ACCEPT,
};

export default uploadService;
