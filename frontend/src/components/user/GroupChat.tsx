import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { addGroupMessage } from "../../redux/slices/groupSlice";
import { useGroupChatSocket } from "../../hooks/useGroupChatSocket";
import { useMessageComposer } from "../../hooks/useMessageComposer";
import type { useGroupCall } from "../../hooks/useGroupCall";
import type { Group } from "../../types/types";
import ConfirmDialog from "../ui/ConfirmDialog";
import StatusToast from "../ui/StatusToast";
import GroupChatHeader from "./group/GroupChatHeader";
import GroupMessageList from "./group/GroupMessageList";
import MessageComposerInput from "./chat/MessageComposerInput";

interface GroupChatProps {
  selectedGroup: Group;
  onBack: () => void;
  groupCall: ReturnType<typeof useGroupCall>;
  onOpenProfile: () => void;
}

export default function GroupChat({
  selectedGroup,
  onBack,
  groupCall,
  onOpenProfile,
}: GroupChatProps) {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? "");
  const currentUserName = useAppSelector((s) => s.auth.user?.name ?? "");
  const groupMessages = useAppSelector((s) => s.group.groupMessages);

  const selectedGroupId = selectedGroup._id;

  const { typingUsers } = useGroupChatSocket({ selectedGroup, currentUserId });

  const composer = useMessageComposer({
    target: {
      kind: "group",
      groupId: selectedGroupId,
      senderName: currentUserName,
    },
    currentUserId,
    onMessageAdded: (message) => dispatch(addGroupMessage(message)),
  });

  const typingList = Array.from(typingUsers.values()).filter(Boolean);
  const typingText =
    typingList.length === 1
      ? `${typingList[0]} is typing...`
      : typingList.length > 1
        ? `${typingList.join(", ")} are typing...`
        : null;

  function handleStartAudioCall() {
    groupCall.startCall(selectedGroup._id, "audio");
  }

  function handleStartVideoCall() {
    groupCall.startCall(selectedGroup._id, "video");
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <GroupChatHeader
        group={selectedGroup}
        typingText={typingText}
        callStatus={groupCall.status}
        onBack={onBack}
        onOpenProfile={onOpenProfile}
        onStartAudioCall={handleStartAudioCall}
        onStartVideoCall={handleStartVideoCall}
      />

      <GroupMessageList
        group={selectedGroup}
        messages={groupMessages}
        currentUserId={currentUserId}
      />

      <MessageComposerInput
        composer={composer}
        placeholder="Message group..."
        ariaLabel="Group message text"
      />

      <ConfirmDialog
        open={composer.attachmentToRemove !== null}
        title="Remove attachment?"
        description="This file will be removed from your draft message."
        confirmLabel="Remove"
        onConfirm={() => {
          if (composer.attachmentToRemove) {
            composer.removePendingAttachment(composer.attachmentToRemove);
          }
          composer.setAttachmentToRemove(null);
        }}
        onCancel={() => composer.setAttachmentToRemove(null)}
      />

      <StatusToast
        toast={composer.toast}
        onDismiss={() => composer.setToast(null)}
      />
    </div>
  );
}
