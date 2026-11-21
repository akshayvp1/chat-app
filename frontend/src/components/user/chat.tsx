import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { useCall } from "../../hooks/useCall";
import { preloadRtcConfiguration } from "../../utils/webrtc";
import { useGroupCall } from "../../hooks/useGroupCall";
import { useDirectChatSocket } from "../../hooks/useDirectChatSocket";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useMessageComposer } from "../../hooks/useMessageComposer";
import { logout } from "../../redux/slices/authSlice";
import { addMessage, clearChat, clearContactUnread, setSelectedContact } from "../../redux/slices/chatSlice";
import { clearGroupChat, clearGroupUnread, setSelectedGroup } from "../../redux/slices/groupSlice";
import chatService from "@/services/user/chatService";
import { disconnectSocket } from "@/socket/socket";
import type { UserList } from "../../types/types";
import CallModal from "./CallModal";
import GroupCallModal from "./GroupCallModal";
import MinimizedCallBar from "../MinimizedCallBar";
import ChatLayout from "./chat/ChatLayout";

export default function Chat() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? "");
  const currentUserName = useAppSelector((s) => s.auth.user?.name ?? "");
  const currentUser = useAppSelector((s) => s.auth.user);
  const messages = useAppSelector((s) => s.chat.messages);
  const contacts = useAppSelector((s) => s.chat.contacts);
  const selectedContact = useAppSelector((s) => s.chat.selectedContact);
  const selectedContactId = useAppSelector((s) => s.chat.selectedContact?._id ?? null);
  const unreadByContact = useAppSelector((s) => s.chat.unreadByContact);
  const groups = useAppSelector((s) => s.group.groups);
  const selectedGroup = useAppSelector((s) => s.group.selectedGroup);
  const selectedGroupId = useAppSelector((s) => s.group.selectedGroup?._id ?? null);
  const unreadByGroup = useAppSelector((s) => s.group.unreadByGroup);
  const groupMessages = useAppSelector((s) => s.group.groupMessages);

  const [historyVersion, setHistoryVersion] = useState(0);
  const [isGroupCallMinimized, setIsGroupCallMinimized] = useState(false);

  useEffect(() => {
    preloadRtcConfiguration();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1-to-1 Calling
  // ─────────────────────────────────────────────────────────────

  const call = useCall({ currentUserId, currentUserName, onCallEnded: () => setHistoryVersion((v) => v + 1) });

  // ─────────────────────────────────────────────────────────────
  // Group Calling
  // IMPORTANT:
  // This hook is at Chat level, NOT inside GroupChat.
  //
  // Therefore switching between chats/groups does not destroy
  // the active group WebRTC call.
  // ─────────────────────────────────────────────────────────────

  const groupCall = useGroupCall({
    currentUserId,
    currentUserName,
    onCallEnded: () => {
      setIsGroupCallMinimized(false);
      setHistoryVersion((v) => v + 1);
    },
  });

  // ─────────────────────────────────────────────────────────────
  // IMPORTANT:
  //
  // Do NOT use selectedGroup here.
  //
  // If the user is in Group A call and switches to Group B,
  // selectedGroup becomes Group B.
  //
  // We need the group belonging to the active call.
  // ─────────────────────────────────────────────────────────────

  const activeCallGroup = groups.find((g) => g._id === groupCall.groupId);
  const composer = useMessageComposer({
    target: { kind: "direct", receiverId: selectedContactId, ready: !!selectedContact },
    currentUserId,
    onMessageAdded: (message) => dispatch(addMessage(message)),
  });
  const settings = useChatSettings({ call, groupCall, onToast: (toast) => composer.setToast(toast) });
  const { onlineUsers, isTyping, clearTypingIndicator } = useDirectChatSocket({
    currentUserId,
    selectedContact,
    selectedGroupId,
    contacts,
    groups,
    notificationPrefs: settings.notificationPrefs,
    callActive: call.status !== "idle" || groupCall.status !== "idle",
  });

  function selectContact(user: UserList) {
    dispatch(setSelectedContact(user));
    dispatch(setSelectedGroup(null));
    dispatch(clearContactUnread(user._id));
    composer.clearPendingAttachments();
    composer.setShowEmojiPicker(false);
    clearTypingIndicator();
  }

  function selectGroup(group: Parameters<typeof setSelectedGroup>[0]) {
    dispatch(setSelectedGroup(group));
    dispatch(setSelectedContact(null));
    if (group) {
      dispatch(clearGroupUnread(group._id));
    }
    composer.clearPendingAttachments();
    composer.setShowEmojiPicker(false);
  }

  async function handleLogout() {
    if (groupCall.status !== "idle") groupCall.leaveCall();
    if (call.status !== "idle") call.endCall();

    composer.clearTypingState();
    disconnectSocket();
    dispatch(clearChat());
    dispatch(clearGroupChat());

    try {
      await chatService.logout();
    } finally {
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  }

  function handleStartAudioCall() {
    if (!selectedContact) return;
    call.startCall(selectedContact._id, selectedContact.name, "audio");
  }

  function handleStartVideoCall() {
    if (!selectedContact) return;
    call.startCall(selectedContact._id, selectedContact.name, "video");
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background font-sans text-foreground">
      <ChatLayout
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserProfile={currentUser?.profile}
        contacts={contacts}
        groups={groups}
        selectedContact={selectedContact}
        selectedGroup={selectedGroup}
        messages={messages}
        groupMessages={groupMessages}
        unreadByContact={unreadByContact}
        unreadByGroup={unreadByGroup}
        onlineUsers={onlineUsers}
        isTyping={isTyping}
        callStatus={call.status}
        groupCall={groupCall}
        composer={composer}
        settings={settings}
        historyVersion={historyVersion}
        onSelectContact={selectContact}
        onSelectGroup={selectGroup}
        onStartAudioCall={handleStartAudioCall}
        onStartVideoCall={handleStartVideoCall}
        onLogout={handleLogout}
      />

      {/* ─────────────────────────────────────────────────────────
          1-to-1 Call modal
          
          Existing implementation preserved.
      ───────────────────────────────────────────────────────── */}

      <CallModal
        status={call.status}
        callType={call.callType}
        peerName={call.peer?.name ?? call.incomingCall?.fromName}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        isMuted={call.isMuted}
        isCameraOff={call.isCameraOff}
        onAccept={call.acceptCall}
        onReject={call.rejectCall}
        onEnd={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
      />

      {/* ─────────────────────────────────────────────────────────
          GROUP CALL MODAL
          
          This is deliberately rendered at Chat root rather than
          inside GroupChat.
          
          That means:
          
          Group A selected
              ↓
          Start group call
              ↓
          Switch to Group B
              ↓
          Group call CONTINUES
      ───────────────────────────────────────────────────────── */}

      {groupCall.status !== "idle" && !isGroupCallMinimized && (
        <GroupCallModal
          status={groupCall.status}
          callType={groupCall.callType}
          groupName={activeCallGroup?.name}
          incomingFromName={groupCall.incomingCall?.fromName}
          localStream={groupCall.localStream}
          participants={groupCall.participants}
          isMuted={groupCall.isMuted}
          isCameraOff={groupCall.isCameraOff}
          onAccept={groupCall.acceptCall}
          onDecline={groupCall.declineCall}
          onLeave={groupCall.leaveCall}
          onToggleMute={groupCall.toggleMute}
          onToggleCamera={groupCall.toggleCamera}
          onMinimize={() => setIsGroupCallMinimized(true)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────
          MINIMIZED GROUP CALL BAR
          
          Only shown when:
          
          1. User clicked minimize
          2. Call is connecting OR in-call
          
          Incoming/other terminal states stay in the modal so
          accept/decline/end controls remain available.
      ───────────────────────────────────────────────────────── */}

      {isGroupCallMinimized &&
        (groupCall.status === "connecting" ||
          groupCall.status === "in-call") && (
          <MinimizedCallBar
            title={activeCallGroup?.name ?? "Group call"}
            isVideo={groupCall.callType === "video"}
            isConnecting={groupCall.status === "connecting"}
            startedAt={groupCall.startedAt}
            onExpand={() => setIsGroupCallMinimized(false)}
            onEnd={groupCall.leaveCall}
          />
        )}
    </div>
  );
}
