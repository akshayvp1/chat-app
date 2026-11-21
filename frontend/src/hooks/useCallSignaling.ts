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
  restartIce: () => Promise<boolean>;
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
  restartIce,
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
    getLocalMedia,
    createPeerConnection,
    finishCall,
  } = media;

  const startCall = useCallback(
    (to: string, toName: string, type: CallType) => {
      if (statusRef.current !== "idle" || callIdRef.current) return;

      const suffix =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      const newCallId = `call_${currentUserId}_${to}_${Date.now()}_${suffix}`;

      isCallerRef.current = true;
      callIdRef.current = newCallId;
      callTypeRef.current = type;
      peerRef.current = { id: to, name: toName };

      setCallType(type);
      setPeer({ id: to, name: toName });
      updateStatus("calling");

      socket.emit("call:initiate", {
        callId: newCallId,
        to,
        from: currentUserId,
        fromName: currentUserName,
        type,
      });
    },
    [
      callIdRef,
      callTypeRef,
      currentUserId,
      currentUserName,
      isCallerRef,
      peerRef,
      setCallType,
      setPeer,
      statusRef,
      updateStatus,
    ]
  );

  const rejectCall = useCallback(() => {
    if (!incomingCall || incomingCall.callId !== callIdRef.current) return;

    socket.emit("call:reject", {
      callId: incomingCall.callId,
      to: incomingCall.from,
      from: currentUserId,
      callType: incomingCall.type,
    });
    finishCall("rejected");
  }, [callIdRef, currentUserId, finishCall, incomingCall]);

  const endCall = useCallback(() => {
    const callId = callIdRef.current;
    const target = peerRef.current;
    if (!callId || !target) {
      finishCall("ended");
      return;
    }

    const status = statusRef.current;
    if (isCallerRef.current && status === "calling") {
      socket.emit("call:cancel", { callId, to: target.id, from: currentUserId, callType: callTypeRef.current });
      finishCall("missed");
      return;
    }
    if (!isCallerRef.current && status === "ringing") {
      socket.emit("call:reject", { callId, to: target.id, from: currentUserId, callType: callTypeRef.current });
      finishCall("rejected");
      return;
    }

    socket.emit("call:end", { callId, to: target.id, from: currentUserId, callType: callTypeRef.current });
    finishCall("ended");
  }, [callIdRef, callTypeRef, currentUserId, finishCall, isCallerRef, peerRef, statusRef]);

  useCallEventHandlers({
    currentUserId,
    refs,
    updateStatus,
    getLocalMedia,
    createPeerConnection,
    finishCall,
    setIncomingCall,
    setCallType,
    setPeer,
    restartIce,
  });

  return { startCall, rejectCall, endCall };
}
