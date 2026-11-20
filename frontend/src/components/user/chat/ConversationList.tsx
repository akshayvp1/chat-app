import { Plus, Search, Users } from "lucide-react";

import Avatar from "../Avatar";
import { BRAND_COLOR } from "../../../constants/brand";
import type { Group, UserList } from "../../../types/types";
import type { ChatTab } from "./ChatSidebar";

interface ConversationListProps {
  activeTab: ChatTab;
  filteredContacts: UserList[];
  filteredGroups: Group[];
  unreadByContact: Record<string, number>;
  unreadByGroup: Record<string, number>;
  onlineUsers: Set<string>;
  selectedContactId: string | null;
  selectedGroupId: string | null;
  onSelectContact: (user: UserList) => void;
  onSelectGroup: (group: Group) => void;
  onOpenCreateGroup: () => void;
}

export default function ConversationList({
  activeTab,
  filteredContacts,
  filteredGroups,
  unreadByContact,
  unreadByGroup,
  onlineUsers,
  selectedContactId,
  selectedGroupId,
  onSelectContact,
  onSelectGroup,
  onOpenCreateGroup,
}: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {activeTab === "direct" && (
        <>
          {filteredContacts.length > 0 ? (
            filteredContacts.map((user) => (
              <button
                key={user._id}
                type="button"
                onClick={() => onSelectContact(user)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4 ${
                  selectedContactId === user._id ? "bg-muted" : ""
                }`}
              >
                <Avatar
                  name={user.name}
                  src={user.profile}
                  online={onlineUsers.has(user._id)}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>

                {(unreadByContact[user._id] ?? 0) > 0 && (
                  <span
                    className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#8065E8] px-1.5 text-[10px] font-bold tabular-nums text-white ring-2 ring-card"
                    aria-label={`${unreadByContact[user._id]} unread messages`}
                    title={`${unreadByContact[user._id]} unread messages`}
                  >
                    {unreadByContact[user._id]}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/15">
                <Search className="h-5 w-5" style={{ color: BRAND_COLOR }} />
              </div>

              <p className="text-sm font-semibold text-foreground">
                No contacts found
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "groups" && (
        <>
          <div className="px-3 py-2 sm:px-4">
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-[#8065E8] hover:bg-muted hover:text-[#8065E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-[#C9BFFF]"
            >
              <Plus className="h-4 w-4 shrink-0" />
              New Group
            </button>
          </div>

          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <button
                key={group._id}
                type="button"
                onClick={() => onSelectGroup(group)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4 ${
                  selectedGroupId === group._id ? "bg-muted" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8065E8]/15 dark:bg-[#8065E8]/25">
                  <Users
                    className="h-5 w-5 text-[#8065E8] dark:text-[#C9BFFF]"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {group.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {(unreadByGroup[group._id] ?? 0) > 0 && (
                  <span
                    className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#8065E8] px-1.5 text-[10px] font-bold tabular-nums text-white ring-2 ring-card"
                    aria-label={`${unreadByGroup[group._id]} unread messages`}
                    title={`${unreadByGroup[group._id]} unread messages`}
                  >
                    {unreadByGroup[group._id]}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/15">
                <Users className="h-5 w-5" style={{ color: BRAND_COLOR }} />
              </div>

              <p className="text-sm font-semibold text-foreground">
                No groups yet
              </p>

              <p className="text-xs text-muted-foreground">
                Create one to get started.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}