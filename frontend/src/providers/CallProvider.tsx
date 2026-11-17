import React, { createContext, useContext, useState } from "react";

import { useAppSelector } from "../redux/hooks";
import { useCall } from "../hooks/useCall";
import { useGroupCall } from "../hooks/useGroupCall";

import CallModal from "../components/user/CallModal";
import GroupCallModal from "../components/user/GroupCallModal";
import MinimizedCallBar from "../components/MinimizedCallBar";

/**
 * Mount this ABOVE your router (or at least above every route element)
 * so that changing pages never unmounts the hooks and never tears down
 * an active WebRTC session:
 *
 *   <Provider store={store}>
 *     <CallProvider>
 *       <BrowserRouter>...</BrowserRouter>
 *     </CallProvider>
 *   </Provider>
 *
 * Chat.tsx then reads the calls from context instead of owning them.
 */

type CallContextValue = {
  call: ReturnType<typeof useCall>;
  groupCall: ReturnType<typeof useGroupCall>;
  historyVersion: number;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCalls() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCalls must be used inside <CallProvider>");
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? "");
  const currentUserName = useAppSelector((s) => s.auth.user?.name ?? "");
  const groups = useAppSelector((s) => s.group.groups);

  // Bumped whenever a call finishes, so CallHistoryModal refetches.
  const [historyVersion, setHistoryVersion] = useState(0);

  const call = useCall({
    currentUserId,
    currentUserName,
    onCallEnded: () => setHistoryVersion((v) => v + 1),
  });

  const groupCall = useGroupCall({
    currentUserId,
    currentUserName,
    onCallEnded: () => setHistoryVersion((v) => v + 1),
  });

  /**
   * Use the group that owns the ACTIVE CALL, not the selected group.
   * After a reload the groups list may not have loaded yet, so fall
   * back to a neutral label rather than rendering nothing.
   */
  const activeCallGroup = groups.find((g) => g._id === groupCall.groupId);

  const showGroupModal = groupCall.status !== "idle" && !groupCall.isMinimized;

  const showMinimizedBar =
    groupCall.isMinimized &&
    (groupCall.status === "connecting" || groupCall.status === "in-call");

  return (
    <CallContext.Provider value={{ call, groupCall, historyVersion }}>
      {children}

      {/* 1-to-1 call */}
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

      {/* Group call */}
      {showGroupModal && (
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
          onMinimize={() => groupCall.setMinimized(true)}
        />
      )}

      {showMinimizedBar && (
        <MinimizedCallBar
          title={activeCallGroup?.name ?? "Group call"}
          isVideo={groupCall.callType === "video"}
          isConnecting={groupCall.status === "connecting"}
          startedAt={groupCall.startedAt}
          onExpand={() => groupCall.setMinimized(false)}
          onEnd={groupCall.leaveCall}
        />
      )}
    </CallContext.Provider>
  );
}