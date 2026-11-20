import { useMemo, useState } from "react";
import { ChevronLeft, Image as ImageIcon, X } from "lucide-react";
import MediaFileList from "./profile/MediaFileList";
import MediaGrid from "./profile/MediaGrid";
import MediaTabs from "./profile/MediaTabs";
import MemberList from "./profile/MemberList";
import ProfileHero from "./profile/ProfileHero";
import {
  flattenMedia,
  getMediaKind,
  tabs,
  type MediaKind,
  type MemberLike,
  type ProfileModalProps,
} from "./profile/profileMedia";

export default function ProfileModal({
  subject,
  messages,
  online = false,
  onClose,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<MediaKind>("image");
  const [selectedMember, setSelectedMember] = useState<MemberLike | null>(null);

  const media = useMemo(() => flattenMedia(messages), [messages]);

  const visibleMedia = selectedMember
    ? media.filter((item) => item.senderId === selectedMember._id)
    : media;
  const shown = visibleMedia.filter((item) => getMediaKind(item) === activeTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border bg-[#EEE9FF]/60 px-4 py-3 dark:bg-[#8065E8]/10 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {selectedMember && (
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                aria-label="Back to group information"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <p id="profile-modal-title" className="truncate text-sm font-bold text-foreground">
              {selectedMember ? "Member profile" : subject.isGroup ? "Group info" : "Profile"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProfileHero subject={subject} member={selectedMember} online={online} />

          {subject.isGroup && !selectedMember && subject.members && (
            <MemberList members={subject.members} onSelect={setSelectedMember} />
          )}

          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Shared media
              </p>
              <span className="text-[11px] text-muted-foreground">{visibleMedia.length} files</span>
            </div>

            <MediaTabs items={visibleMedia} activeTab={activeTab} onChange={setActiveTab} />

            {shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <ImageIcon className="h-7 w-7 text-[#8065E8]/60" />
                <p className="text-sm font-semibold text-foreground">No {tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} yet</p>
                <p className="text-xs text-muted-foreground">Files shared here will appear in this tab.</p>
              </div>
            ) : activeTab === "image" || activeTab === "video" ? (
              <MediaGrid items={shown} kind={activeTab} />
            ) : (
              <MediaFileList items={shown} kind={activeTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
