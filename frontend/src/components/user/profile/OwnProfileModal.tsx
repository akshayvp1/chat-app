import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setUser } from "../../../redux/slices/authSlice";
import uploadService, { type ProfileChanges } from "../../../services/user/uploadService";
import type { User } from "../../../types/types";
import Avatar from "../Avatar";

interface OwnProfileModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const MAX_BIO_LENGTH = 300;

function mergeUser(value: unknown, fallback: User, profileUrl?: string): User {
  const candidate = value && typeof value === "object" ? (value as Partial<User>) : {};
  const text = (input: unknown, fallbackValue: string) =>
    typeof input === "string" ? input : fallbackValue;

  return {
    _id: text(candidate._id, fallback._id),
    name: text(candidate.name, fallback.name),
    email: text(candidate.email, fallback.email),
    phone: text(candidate.phone, fallback.phone),
    profile: text(candidate.profile, profileUrl ?? fallback.profile ?? ""),
    bio: text(candidate.bio, fallback.bio ?? ""),
  };
}

export default function OwnProfileModal({ onClose, onSuccess }: OwnProfileModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
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
    if (!user) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("Name must be between 2 and 50 characters.");
      return;
    }

    const trimmedBio = bio.trim();
    if (trimmedBio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`);
      return;
    }

    const changes: ProfileChanges = {};
    if (trimmedName !== user.name) changes.name = trimmedName;
    if (trimmedBio !== (user.bio ?? "")) changes.bio = trimmedBio;

    setSaving(true);
    setError("");

    try {
      if (selectedFile) {
        const attachment = await uploadService.uploadFile(selectedFile, "profile");
        changes.profile = attachment.url;
      }

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }

      const returnedUser = await uploadService.updateProfile(changes);
      dispatch(setUser(mergeUser(returnedUser, user, changes.profile)));
      onSuccess("Profile updated successfully.");
      onClose();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update your profile.");
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
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="own-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5 dark:border-border">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/20">
              <Camera className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
            </div>
            <p id="own-profile-title" className="truncate text-sm font-bold text-foreground">
              My profile
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            title="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 px-4 pt-5 sm:px-5">
          <Avatar name={name || user?.name || "Me"} src={previewUrl ?? user?.profile} size="lg" />

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
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            Change picture
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            JPG, PNG, GIF, WebP, or AVIF up to 5MB.
          </p>
          {selectedFile && (
            <p className="max-w-full truncate text-[11px] text-muted-foreground" title={selectedFile.name}>
              {selectedFile.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 px-4 py-5 sm:px-5">
          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
            Full name
            <input
              type="text"
              value={name}
              maxLength={50}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[#8065E8] focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
            Email
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="cursor-not-allowed rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-normal text-muted-foreground"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
            Bio
            <textarea
              value={bio}
              rows={3}
              maxLength={MAX_BIO_LENGTH}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell others about yourself"
              className="resize-none rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[#8065E8] focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>

          <p className="text-right text-[11px] text-muted-foreground">
            {bio.length}/{MAX_BIO_LENGTH}
          </p>

          {error && (
            <p className="text-xs font-medium text-red-500 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
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
            disabled={saving}
            className="rounded-xl bg-[#8065E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6F54D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
