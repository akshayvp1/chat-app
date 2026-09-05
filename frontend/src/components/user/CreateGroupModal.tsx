// CreateGroupModal.tsx
// Modal to create a new group — select members from contacts, set name + description.

import React, { useState } from "react";
import { X, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { addGroup } from "../../redux/slices/groupSlice";
import groupService from "@/services/user/groupService";
import type { UserList } from "../../types/types";

const BRAND_COLOR = "#5b7cfa";

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
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    if (selectedMembers.size === 0) {
      setError("Select at least one member.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await groupService.createGroup(
      name.trim(),
      description.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${BRAND_COLOR}20` }}
            >
              <Users className="h-4 w-4" style={{ color: BRAND_COLOR }} />
            </div>
            <p className="font-bold text-slate-900 text-sm">New Group</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Group name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Group Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Project Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 text-sm"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Description{" "}
              <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-50 text-sm"
            />
          </div>

          {/* Member selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Add Members{" "}
              {selectedMembers.size > 0 && (
                <span style={{ color: BRAND_COLOR }}>({selectedMembers.size} selected)</span>
              )}
            </label>

            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
              {contacts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No contacts available</p>
              ) : (
                contacts.map((user: UserList) => {
                  const selected = selectedMembers.has(user._id);
                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleMember(user._id)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-indigo-50 ${
                        selected ? "bg-indigo-50" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>

                      {/* Checkmark */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected
                            ? "border-transparent"
                            : "border-slate-300"
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
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-600 text-sm"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedMembers.size === 0}
            className="text-sm text-white rounded-xl px-5"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}