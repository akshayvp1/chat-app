import { ArrowLeft, MoreVertical, Phone, Users, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND_COLOR } from "../../../constants/brand";
import type { GroupCallUIStatus } from "../../../hooks/useGroupCall";
import type { Group } from "../../../types/types";

interface GroupChatHeaderProps {
  group: Group;
  typingText: string | null;
  callStatus: GroupCallUIStatus;
  onBack: () => void;
  onOpenProfile: () => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export default function GroupChatHeader({
  group,
  typingText,
  callStatus,
  onBack,
  onOpenProfile,
  onStartAudioCall,
  onStartVideoCall,
}: GroupChatHeaderProps) {
  const memberCount = group.members.length;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-3 shadow-sm sm:gap-3 sm:px-4 dark:border-border">
      <button
        type="button"
        onClick={onBack}
        className="mr-0.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
        title="Back to conversations"
        aria-label="Back to conversations"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onOpenProfile}
        title="View group details"
        aria-label="View group details"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <Users className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {group.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {typingText ? (
            <span className="italic text-[#8065E8] dark:text-[#C9BFFF]">
              {typingText}
            </span>
          ) : (
            `${memberCount} member${memberCount !== 1 ? "s" : ""}`
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={onStartAudioCall}
          disabled={callStatus !== "idle"}
          title="Audio call"
          aria-label="Start group audio call"
        >
          <Phone className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={onStartVideoCall}
          disabled={callStatus !== "idle"}
          title="Video call"
          aria-label="Start group video call"
        >
          <Video className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={onOpenProfile}
          title="More options"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
