// CreateGroupModal.tsx
// Modal to create a new group — select members from contacts, set name + description.

import { useState } from "react";
import { X, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { addGroup } from "../../redux/slices/groupSlice";
import groupService from "@/services/user/groupService";
import type { UserList } from "../../types/types";
import Avatar from "./Avatar";
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  normalizeText,
  validateGroupDescription,
  validateGroupName,
} from "../../utils/validation";

const BRAND_COLOR = "#8065E8";

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated: () => void;
}

export default function CreateGroupModal({ onClose, onGroupCreated }: CreateGroupModalProps) {
  const dispatch = useAppDispatch();
  const contacts = useAppSelector((s) => s.chat.contacts);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleMember(userId: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleCreate() {
    const nameError = validateGroupName(name);
    const descriptionError = validateGroupDescription(description);

    if (nameError) {
      setError(nameError);
      return;
    }
    if (descriptionError) {
      setError(descriptionError);
      return;
    }
    if (selectedMembers.size === 0) {
      setError("Select at least one member.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await groupService.createGroup(
      normalizeText(name),
      normalizeText(description),
      Array.from(selectedMembers)
    );

    setLoading(false);

    if (res.success && res.data) {
      dispatch(addGroup(res.data));
      onGroupCreated();
      onClose();
    } else {
      setError(res.message ?? "Failed to create group.");
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-5 dark:border-border">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8065E8]/15 dark:bg-[#8065E8]/25"
            >
              <Users className="h-4 w-4 text-[#8065E8] dark:text-[#C9BFFF]" />
            </div>
            <p id="create-group-title" className="truncate text-sm font-bold text-foreground">New Group</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            title="Close"
            aria-label="Close create group modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          {/* Group name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Group Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Project Alpha"
              value={name}
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              aria-label="Group name"
              className="bg-muted/60 text-sm"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description{" "}
              <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="What's this group about?"
              value={description}
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Group description"
              className="bg-muted/60 text-sm"
            />
          </div>

          {/* Member selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add Members{" "}
              {selectedMembers.size > 0 && (
                <span style={{ color: BRAND_COLOR }}>({selectedMembers.size} selected)</span>
              )}
            </label>

            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-background/40">
              {contacts.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No contacts available</p>
              ) : (
                contacts.map((user: UserList) => {
                  const selected = selectedMembers.has(user._id);
                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleMember(user._id)}
                      className={`flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4 ${
                        selected ? "bg-muted" : ""
                      }`}
                      aria-pressed={selected}
                    >
                      {/* Avatar */}
                      <Avatar name={user.name} src={user.profile} size="sm" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>

                      {/* Checkmark */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          selected
                            ? "border-transparent"
                            : "border-muted-foreground/40"
                        }`}
                        style={selected ? { backgroundColor: BRAND_COLOR } : {}}
                      >
                        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-medium text-red-500 dark:text-red-400" role="alert">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-4 sm:px-5 dark:border-border">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-sm text-muted-foreground"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              loading ||
              validateGroupName(name) !== null ||
              selectedMembers.size === 0
            }
            className="rounded-xl px-5 text-sm text-white focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}