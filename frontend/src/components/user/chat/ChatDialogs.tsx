import ConfirmDialog from "../../ui/ConfirmDialog";
import StatusToast, { type StatusToastData } from "../../ui/StatusToast";
import CallHistoryModal from "../CallHistoryModal";
import CreateGroupModal from "../CreateGroupModal";
import ProfileModal from "../ProfileModal";
import ProfilePictureModal from "../ProfilePictureModal";
import OwnProfileModal from "../profile/OwnProfileModal";
import type {
  ChatMessage,
  Group,
  GroupMessage,
  UserList,
} from "../../../types/types";

interface ChatDialogsProps {
  showCreateGroup: boolean;
  onCloseCreateGroup: () => void;
  onGroupCreated: () => void;
  showCallHistory: boolean;
  currentUserId: string;
  historyVersion: number;
  onCloseCallHistory: () => void;
  showProfileModal: boolean;
  onCloseProfileModal: () => void;
  onProfileSuccess: (message: string) => void;
  showOwnProfile: boolean;
  onCloseOwnProfile: () => void;
  onOwnProfileSuccess: (message: string) => void;
  showProfileDetails: boolean;
  selectedContact: UserList | null;
  messages: ChatMessage[];
  contactOnline: boolean;
  onCloseProfileDetails: () => void;
  showGroupProfile: boolean;
  selectedGroup: Group | null;
  groupMessages: GroupMessage[];
  onCloseGroupProfile: () => void;
  showLogoutConfirm: boolean;
  onConfirmLogout: () => void;
  onCancelLogout: () => void;
  attachmentToRemove: string | null;
  onConfirmRemoveAttachment: (id: string) => void;
  onCancelRemoveAttachment: () => void;
  toast: StatusToastData | null;
  onDismissToast: () => void;
}

export default function ChatDialogs({
  showCreateGroup,
  onCloseCreateGroup,
  onGroupCreated,
  showCallHistory,
  currentUserId,
  historyVersion,
  onCloseCallHistory,
  showProfileModal,
  onCloseProfileModal,
  onProfileSuccess,
  showOwnProfile,
  onCloseOwnProfile,
  onOwnProfileSuccess,
  showProfileDetails,
  selectedContact,
  messages,
  contactOnline,
  onCloseProfileDetails,
  showGroupProfile,
  selectedGroup,
  groupMessages,
  onCloseGroupProfile,
  showLogoutConfirm,
  onConfirmLogout,
  onCancelLogout,
  attachmentToRemove,
  onConfirmRemoveAttachment,
  onCancelRemoveAttachment,
  toast,
  onDismissToast,
}: ChatDialogsProps) {
  return (
    <>
      {showCreateGroup && (
        <CreateGroupModal
          onClose={onCloseCreateGroup}
          onGroupCreated={onGroupCreated}
        />
      )}

      {showCallHistory && (
        <CallHistoryModal
          currentUserId={currentUserId}
          refreshKey={historyVersion}
          onClose={onCloseCallHistory}
        />
      )}

      {showProfileModal && (
        <ProfilePictureModal
          onClose={onCloseProfileModal}
          onSuccess={onProfileSuccess}
        />
      )}

      {showOwnProfile && (
        <OwnProfileModal onClose={onCloseOwnProfile} onSuccess={onOwnProfileSuccess} />
      )}

      {showProfileDetails && selectedContact && (
        <ProfileModal
          subject={{
            id: selectedContact._id,
            name: selectedContact.name,
            email: selectedContact.email,
            profile: selectedContact.profile,
            subtitle: contactOnline ? "Online" : "Offline",
          }}
          messages={messages}
          online={contactOnline}
          onClose={onCloseProfileDetails}
        />
      )}

      {showGroupProfile && selectedGroup && (
        <ProfileModal
          subject={{
            id: selectedGroup._id,
            name: selectedGroup.name,
            subtitle: selectedGroup.description,
            isGroup: true,
            members: selectedGroup.members,
          }}
          messages={groupMessages}
          onClose={onCloseGroupProfile}
        />
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out?"
        description="You will need to sign in again to continue chatting."
        confirmLabel="Log out"
        onConfirm={onConfirmLogout}
        onCancel={onCancelLogout}
      />

      <ConfirmDialog
        open={attachmentToRemove !== null}
        title="Remove attachment?"
        description="This file will be removed from your draft message."
        confirmLabel="Remove"
        onConfirm={() => {
          if (attachmentToRemove) {
            onConfirmRemoveAttachment(attachmentToRemove);
          }
          onCancelRemoveAttachment();
        }}
        onCancel={onCancelRemoveAttachment}
      />

      <StatusToast toast={toast} onDismiss={onDismissToast} />
    </>
  );
}
