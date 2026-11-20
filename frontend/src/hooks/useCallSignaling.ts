import { useCallback } from "react";
import { socket } from "../socket/socket";
import type { CallType, IncomingCall } from "../types/callTypes";
import type { DirectCallMedia } from "../utils/webrtc";
import type { CallSignalingRefs } from "./useCallEventHandlers";
import { useCallEventHandlers } from "./useCallEventHandlers";

export interface UseCallSignalingParams {
  currentUserId: string;
  currentUserName: string;
  incomingCall: IncomingCall | null;
  setIncomingCall: (call: IncomingCall | null) => void;
  setCallType: (type: CallType | null) => void;
  setPeer: (peer: { id: string; name: string } | null) => void;
  refs: CallSignalingRefs;
  media: DirectCallMedia;
}

export function useCallSignaling({
  currentUserId,
  currentUserName,
  incomingCall,
  setIncomingCall,
  setCallType,
  setPeer,
  refs,
  media,
}: UseCallSignalingParams) {
  const {
    statusRef,
    isCallerRef,
    peerRef,
    callTypeRef,
    callIdRef,
  } = refs;
  const {
    updateStatus,
    disposeMedia,
    getLocalMedia,
    createPeerConnection,
    cleanupCall,
  } = media;

  const startCall = useCallback(
    (to: string, toName: string, type: CallType) => {
      const newCallId = `${currentUserId}_${to}_${Date.now()}`;

      isCallerRef.current = true;
      callIdRef.current = newCallId;
      callTypeRef.current = type;
      peerRef.current = { id: to, name: toName };

      setCallType(type);
      setPeer({ id: to, name: toName });
      media.updateStatus("calling");

      socket.emit("call:initiate", {
        callId: newCallId,
        to,
        from: currentUserId,
        fromName: currentUserName,
        type,
      });
    },
    [
      currentUserId,
      currentUserName,
      setCallType,
      setPeer,
      media,
      callIdRef,
      callTypeRef,
      isCallerRef,
      peerRef,
    ]
  );

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit("call:reject", {
      callId: incomingCall.callId,
      to: incomingCall.from,
      from: currentUserId,
    });
    setIncomingCall(null);
    updateStatus("idle");
    disposeMedia();
  }, [
    incomingCall,
    currentUserId,
    updateStatus,
    disposeMedia,
    setIncomingCall,
  ]);

  const endCall = useCallback(() => {
    if (callIdRef.current && peerRef.current) {
      const event =
        isCallerRef.current && statusRef.current === "calling"
          ? "call:cancel"
          : "call:end";
      socket.emit(event, {
        callId: callIdRef.current,
        to: peerRef.current.id,
        from: currentUserId,
      });
    }
    cleanupCall();
  }, [
    currentUserId,
    cleanupCall,
    callIdRef,
    isCallerRef,
    peerRef,
    statusRef,
  ]);

  useCallEventHandlers({
    currentUserId,
    refs,
    updateStatus,
    getLocalMedia,
    createPeerConnection,
    cleanupCall,
    endCall,
    setIncomingCall,
  });

  return { startCall, rejectCall, endCall };
}
