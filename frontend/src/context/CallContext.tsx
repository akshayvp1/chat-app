import { useCallback, useEffect, useState, type ReactNode } from "react";

import CallModal from "../components/user/CallModal";
import GroupCallModal from "../components/user/GroupCallModal";
import MinimizedCallBar from "../components/MinimizedCallBar";
import { CallContext } from "./callContextValue";
import { useCall } from "../hooks/useCall";
import { useGroupCall } from "../hooks/useGroupCall";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { incrementCallHistoryVersion } from "../redux/slices/chatSlice";
import { preloadRtcConfiguration } from "../utils/webrtc";

export function CallProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? "");
  const currentUserName = useAppSelector((state) => state.auth.user?.name ?? "");
  const groups = useAppSelector((state) => state.group.groups);

  const [minimizedCallKey, setMinimizedCallKey] = useState<string | null>(null);

  const handleCallEnded = useCallback(() => {
    dispatch(incrementCallHistoryVersion());
  }, [dispatch]);

  const call = useCall({
    currentUserId,
    currentUserName,
    onCallEnded: handleCallEnded,
  });

  const groupCall = useGroupCall({
    currentUserId,
    currentUserName,
    onCallEnded: handleCallEnded,
  });

  useEffect(() => {
    preloadRtcConfiguration();
  }, []);

  const activeCallGroup = groups.find((group) => group._id === groupCall.groupId);
  const directCanMinimize =
    call.status === "calling" ||
    call.status === "connecting" ||
    call.status === "connected";

  const directCallKey = directCanMinimize
    ? `${call.peer?.id ?? ""}:${call.startedAt ?? ""}`
    : null;
  const isDirectMinimized =
    directCallKey !== null && minimizedCallKey === directCallKey;

  return (
    <CallContext.Provider value={{ call, groupCall }}>
      {children}

      {call.status !== "idle" &&
        (!isDirectMinimized || !directCanMinimize) && (
          <CallModal
            status={call.status}
            callType={call.callType}
            peerName={call.peer?.name ?? call.incomingCall?.fromName}
            localStream={call.localStream}
            remoteStream={call.remoteStream}
            isMuted={call.isMuted}
            isCameraOff={call.isCameraOff}
            facingMode={call.facingMode}
            mediaUnavailable={call.mediaUnavailable}
            onAccept={call.acceptCall}
            onReject={call.rejectCall}
            onEnd={call.endCall}
            onToggleMute={call.toggleMute}
            onToggleCamera={call.toggleCamera}
            onSwitchCamera={call.switchCamera}
            onMinimize={() => setMinimizedCallKey(directCallKey)}
          />
        )}

      {isDirectMinimized && directCanMinimize && (
        <MinimizedCallBar
          title={call.peer?.name ?? "Direct call"}
          isVideo={call.callType === "video"}
          isConnecting={call.status === "calling" || call.status === "connecting"}
          startedAt={call.startedAt}
          onExpand={() => setMinimizedCallKey(null)}
          onEnd={call.endCall}
        />
      )}

      {groupCall.status !== "idle" && !groupCall.isMinimized && (
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

      {groupCall.isMinimized &&
        (groupCall.status === "connecting" ||
          groupCall.status === "in-call") && (
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
