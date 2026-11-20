import { useEffect, useRef, useState } from "react";

import { useAppDispatch } from "../../../redux/hooks";
import { setGroups } from "../../../redux/slices/groupSlice";
import groupService from "@/services/user/groupService";
import type { CallStatus } from "../../../hooks/useCall";
import type { useGroupCall } from "../../../hooks/useGroupCall";
import type {
  ChatSettingsResult,
} from "../../../hooks/useChatSettings";
import type { MessageComposerResult } from "../../../hooks/useMessageComposer";
import type {
  ChatMessage,
  Group,
  GroupMessage,
  UserList,
} from "../../../types/types";
import ChatDialogs from "./ChatDialogs";
import ChatSidebar, { type ChatTab } from "./ChatSidebar";
import DirectChatPanel from "./DirectChatPanel";
import EmptyState from "./EmptyState";
import SettingsMenu from "./SettingsMenu";
import GroupChat from "../GroupChat";

interface ChatLayoutProps {
  currentUserId: string;
  currentUserName: string;
  currentUserProfile?: string;
  contacts: UserList[];
  groups: Group[];
  selectedContact: UserList | null;
  selectedGroup: Group | null;
  messages: ChatMessage[];
  groupMessages: GroupMessage[];
  unreadByContact: Record<string, number>;
  unreadByGroup: Record<string, number>;
  onlineUsers: Set<string>;
  isTyping: boolean;
  callStatus: CallStatus;
  groupCall: ReturnType<typeof useGroupCall>;
  composer: MessageComposerResult;
  settings: ChatSettingsResult;
  historyVersion: number;
  onSelectContact: (user: UserList) => void;
  onSelectGroup: (group: Group | null) => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onLogout: () => void;
}

export default function ChatLayout({
  currentUserId,
  currentUserName,
  currentUserProfile,
  contacts,
  groups,
  selectedContact,
  selectedGroup,
  messages,
  groupMessages,
  unreadByContact,
  unreadByGroup,
  onlineUsers,
  isTyping,
  callStatus,
  groupCall,
  composer,
  settings,
  historyVersion,
  onSelectContact,
  onSelectGroup,
  onStartAudioCall,
  onStartVideoCall,
  onLogout,
}: ChatLayoutProps) {
  const dispatch = useAppDispatch();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOwnProfile, setShowOwnProfile] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<ChatTab>("direct");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const nothingSelected = !selectedContact && !selectedGroup;

  return (
    <>
      <ChatSidebar
        show={showSidebar}
        currentUserName={currentUserName}
        currentUserProfile={currentUserProfile}
        filteredContacts={filteredContacts}
        filteredGroups={filteredGroups}
        unreadByContact={unreadByContact}
        unreadByGroup={unreadByGroup}
        onlineUsers={onlineUsers}
        selectedContactId={selectedContact?._id ?? null}
        selectedGroupId={selectedGroup?._id ?? null}
        activeTab={activeTab}
        searchQuery={searchQuery}
        showSettingsMenu={showSettingsMenu}
        settingsMenu={
          <SettingsMenu
            theme={settings.theme}
            notificationPrefs={settings.notificationPrefs}
            callSoundSettings={settings.callSoundSettings}
            onToggleTheme={settings.toggleTheme}
            onToggleMessageSound={settings.toggleMessageSound}
            onToggleCallSounds={settings.toggleCallSounds}
            onRingtoneVolumeChange={settings.handleRingtoneVolumeChange}
            onPlayRingtonePreview={settings.playRingtonePreview}
            onStopSoundPreview={settings.stopSoundPreview}
            onToggleDesktopNotifications={settings.toggleDesktopNotifications}
            onChangeProfilePicture={() => {
              setShowSettingsMenu(false);
              setShowProfileModal(true);
            }}
          />
        }
        onSelectTab={setActiveTab}
        onSearchChange={setSearchQuery}
        onSelectContact={(user) => {
          onSelectContact(user);
          setShowSidebar(false);
        }}
        onSelectGroup={(group) => {
          onSelectGroup(group);
          setShowSidebar(false);
        }}
        onOpenCallHistory={() => setShowCallHistory(true)}
        onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
        onToggleSettings={() => setShowSettingsMenu((open) => !open)}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenOwnProfile={() => setShowOwnProfile(true)}
      />

      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } sm:flex min-h-0 min-w-0 flex-1 flex-col bg-background`}
      >
        {selectedGroup && (
          <GroupChat
            selectedGroup={selectedGroup}
            onBack={() => setShowSidebar(true)}
            groupCall={groupCall}
            onOpenProfile={() => setShowGroupProfile(true)}
          />
        )}

        {selectedContact && !selectedGroup && (
          <DirectChatPanel
            selectedContact={selectedContact}
            messages={messages}
            currentUserId={currentUserId}
            isTyping={isTyping}
            online={onlineUsers.has(selectedContact._id)}
            callStatus={callStatus}
            composer={composer}
            messagesEndRef={messagesEndRef}
            onBack={() => setShowSidebar(true)}
            onOpenProfile={() => setShowProfileDetails(true)}
            onStartAudioCall={onStartAudioCall}
            onStartVideoCall={onStartVideoCall}
          />
        )}

        {nothingSelected && <EmptyState />}
      </div>

      <ChatDialogs
        showCreateGroup={showCreateGroup}
        onCloseCreateGroup={() => setShowCreateGroup(false)}
        onGroupCreated={() => {
          groupService.getMyGroups().then((res) => {
            if (res.success && res.data) {
              dispatch(setGroups(res.data));
            }
          });
        }}
        showCallHistory={showCallHistory}
        currentUserId={currentUserId}
        historyVersion={historyVersion}
        onCloseCallHistory={() => setShowCallHistory(false)}
        showProfileModal={showProfileModal}
        onCloseProfileModal={() => setShowProfileModal(false)}
        onProfileSuccess={(message) =>
          composer.setToast({ kind: "success", message })
        }
        showOwnProfile={showOwnProfile}
        onCloseOwnProfile={() => setShowOwnProfile(false)}
        onOwnProfileSuccess={(message) =>
          composer.setToast({ kind: "success", message })
        }
        showProfileDetails={showProfileDetails}
        selectedContact={selectedContact}
        messages={messages}
        contactOnline={selectedContact
          ? onlineUsers.has(selectedContact._id)
          : false}
        onCloseProfileDetails={() => setShowProfileDetails(false)}
        showGroupProfile={showGroupProfile}
        selectedGroup={selectedGroup}
        groupMessages={groupMessages}
        onCloseGroupProfile={() => setShowGroupProfile(false)}
        showLogoutConfirm={showLogoutConfirm}
        onConfirmLogout={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancelLogout={() => setShowLogoutConfirm(false)}
        attachmentToRemove={composer.attachmentToRemove}
        onConfirmRemoveAttachment={composer.removePendingAttachment}
        onCancelRemoveAttachment={() => composer.setAttachmentToRemove(null)}
        toast={composer.toast}
        onDismissToast={() => composer.setToast(null)}
      />
    </>
  );
}
