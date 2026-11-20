import type { ReactNode } from "react";
import { MessageSquare, Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { BRAND_COLOR } from "../../../constants/brand";
import type { Group, UserList } from "../../../types/types";
import ConversationList from "./ConversationList";
import OwnProfileButton from "./OwnProfileButton";
import SidebarHeader from "./SidebarHeader";

export type ChatTab = "direct" | "groups";

interface ChatSidebarProps {
  show: boolean;
  currentUserName: string;
  currentUserProfile?: string;
  filteredContacts: UserList[];
  filteredGroups: Group[];
  unreadByContact: Record<string, number>;
  unreadByGroup: Record<string, number>;
  onlineUsers: Set<string>;
  selectedContactId: string | null;
  selectedGroupId: string | null;
  activeTab: ChatTab;
  searchQuery: string;
  showSettingsMenu: boolean;
  settingsMenu: ReactNode;
  onSelectTab: (tab: ChatTab) => void;
  onSearchChange: (value: string) => void;
  onSelectContact: (user: UserList) => void;
  onSelectGroup: (group: Group) => void;
  onOpenCallHistory: () => void;
  onOpenLogoutConfirm: () => void;
  onToggleSettings: () => void;
  onOpenCreateGroup: () => void;
  onOpenOwnProfile: () => void;
}

export default function ChatSidebar({
  show,
  currentUserName,
  currentUserProfile,
  filteredContacts,
  filteredGroups,
  unreadByContact,
  unreadByGroup,
  onlineUsers,
  selectedContactId,
  selectedGroupId,
  activeTab,
  searchQuery,
  showSettingsMenu,
  settingsMenu,
  onSelectTab,
  onSearchChange,
  onSelectContact,
  onSelectGroup,
  onOpenCallHistory,
  onOpenLogoutConfirm,
  onToggleSettings,
  onOpenCreateGroup,
  onOpenOwnProfile,
}: ChatSidebarProps) {
  return (
    <div
      className={`${
        show ? "flex" : "hidden"
      } sm:flex min-h-0 w-full max-w-full shrink-0 flex-col border-r border-border bg-card sm:w-80 dark:border-border`}
    >
      <SidebarHeader
        showSettingsMenu={showSettingsMenu}
        settingsMenu={settingsMenu}
        onOpenCallHistory={onOpenCallHistory}
        onOpenLogoutConfirm={onOpenLogoutConfirm}
        onToggleSettings={onToggleSettings}
      />

      <OwnProfileButton
        name={currentUserName}
        profile={currentUserProfile}
        onClick={onOpenOwnProfile}
      />

      <div className="px-3 py-3 sm:px-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search conversations"
            className="bg-muted/60 pl-9 text-sm"
          />

          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="mb-1 flex gap-1 rounded-xl bg-muted/60 p-1 mx-3 sm:mx-4">
        <button
          type="button"
          onClick={() => onSelectTab("direct")}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            activeTab === "direct"
              ? "text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          style={
            activeTab === "direct" ? { backgroundColor: BRAND_COLOR } : {}
          }
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Direct
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("groups")}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            activeTab === "groups"
              ? "text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          style={
            activeTab === "groups" ? { backgroundColor: BRAND_COLOR } : {}
          }
        >
          <Users className="h-3.5 w-3.5" />
          Groups
        </button>
      </div>

      <ConversationList
        activeTab={activeTab}
        filteredContacts={filteredContacts}
        filteredGroups={filteredGroups}
        unreadByContact={unreadByContact}
        unreadByGroup={unreadByGroup}
        onlineUsers={onlineUsers}
        selectedContactId={selectedContactId}
        selectedGroupId={selectedGroupId}
        onSelectContact={onSelectContact}
        onSelectGroup={onSelectGroup}
        onOpenCreateGroup={onOpenCreateGroup}
      />
    </div>
  );
}