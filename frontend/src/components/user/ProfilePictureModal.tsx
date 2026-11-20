import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Upload, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setUser } from "../../redux/slices/authSlice";
import uploadService from "../../services/user/uploadService";
import type { User } from "../../types/types";
import Avatar from "./Avatar";

interface ProfilePictureModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

function normalizeUser(value: unknown, fallback: User | null, profileUrl: string): User {
  const candidate = value && typeof value === "object" ? (value as Partial<User>) : {};
  const asString = (input: unknown, fallbackValue: string) =>
    typeof input === "string" ? input : fallbackValue;

  const nextProfile =
    typeof candidate.profile === "string" && candidate.profile.trim().length > 0
      ? candidate.profile
      : profileUrl;

  return {
    _id: asString(candidate._id, fallback?._id ?? ""),
    name: asString(candidate.name, fallback?.name ?? ""),
    email: asString(candidate.email, fallback?.email ?? ""),
    phone: asString(candidate.phone, fallback?.phone ?? ""),
    profile: nextProfile,
  };
}

export default function ProfilePictureModal({ onClose, onSuccess }: ProfilePictureModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationError = uploadService.validateProfileImage(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(file);
    setError("");
  }

  async function handleSave() {
    if (!selectedFile) {
      setError("Choose an image first.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const attachment = await uploadService.uploadFile(selectedFile, "profile");
      const returnedUser = await uploadService.updateProfilePicture(attachment.url);
      dispatch(setUser(normalizeUser(returnedUser, user, attachment.url)));
      onSuccess?.("Profile picture updated successfully.");
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not update your profile picture.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-picture-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5 dark:border-border">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/20">
              <Camera className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
            </div>
            <p id="profile-picture-title" className="truncate text-sm font-bold text-foreground">Profile picture</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile picture modal"
            title="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-5 sm:px-5">
          <Avatar
            name={user?.name ?? "Me"}
            src={previewUrl ?? user?.profile}
            size="lg"
          />

          <p className="text-center text-xs text-muted-foreground">JPG, PNG, GIF, WebP, or AVIF up to 5MB.</p>

          <input
            ref={fileInputRef}
            type="file"
            accept={uploadService.PROFILE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            Choose image
          </button>

          {selectedFile && (
            <p className="max-w-full truncate text-[11px] text-muted-foreground" title={selectedFile.name}>{selectedFile.name}</p>
          )}

          {error && <p className="text-center text-xs font-medium text-red-500 dark:text-red-400" role="alert">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-4 sm:px-5 dark:border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile || saving}
            className="flex items-center gap-1.5 rounded-xl bg-[#8065E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6F54D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
