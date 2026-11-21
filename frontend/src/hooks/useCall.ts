import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import type { CallStatus, CallType, IncomingCall } from "../types/callTypes";
import {
  startIncomingRingtone,
  startOutgoingRingback,
  stopRingtone,
} from "../utils/ringtone";
import { getRtcConfiguration, useDirectCallMedia } from "../utils/webrtc";
import { useCallSignaling } from "./useCallSignaling";

export type { CallStatus, CallType } from "../types/callTypes";

interface UseCallParams {
  currentUserId: string;
  currentUserName: string;
  onCallEnded?: () => void;
}

export function useCall({
  currentUserId,
  currentUserName,
  onCallEnded,
}: UseCallParams) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const mediaRequestIdRef = useRef(0);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const peerRef = useRef<{ id: string; name: string } | null>(null);
  const callTypeRef = useRef<CallType | null>(null);
  const isCallerRef = useRef(false);
  const statusRef = useRef<CallStatus>("idle");
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  const emitCandidate = useCallback(
    (callId: string, to: string, candidate: RTCIceCandidate) =>
      socket.emit("call:ice-candidate", {
        callId,
        to,
        from: currentUserId,
        callType: callTypeRef.current,
        candidate: candidate.toJSON(),
      }),
    [currentUserId]
  );

  const emitConnected = useCallback(
    (callId: string, to: string) =>
      socket.emit("call:connected", {
        callId,
        to,
        from: currentUserId,
        callType: callTypeRef.current,
      }),
    [currentUserId]
  );

  const emitNetworkFailure = useCallback(
    (callId: string, to: string) =>
      socket.emit("call:end", { callId, to, from: currentUserId, reason: "network" }),
    [currentUserId]
  );

  const media = useDirectCallMedia({
    pcRef,
    localStreamRef,
    mediaPromiseRef,
    mediaRequestIdRef,
    remoteStreamRef,
    callIdRef,
    peerRef,
    callTypeRef,
    isCallerRef,
    statusRef,
    pendingCandidatesRef: pendingCandidates,
    onCallEndedRef,
    setStatus,
    setCallType,
    setPeer,
    setIncomingCall,
    setLocalStream,
    setRemoteStream,
    setIsMuted,
    setIsCameraOff,
    emitCandidate,
    emitConnected,
    emitNetworkFailure,
  });

  const { disposeMedia, finishCall } = media;

  useEffect(() => {
    if (status === "ringing") startIncomingRingtone(callType ?? "audio");
    else if (status === "calling") startOutgoingRingback(callType ?? "audio");
    else stopRingtone("direct");
  }, [status, callType]);

  useEffect(
    () => () => {
      stopRingtone("direct");
      disposeMedia();
    },
    [disposeMedia]
  );

  useEffect(() => {
    const onConnect = () => {
      const callId = callIdRef.current;
      const target = peerRef.current;
      if (callId && target && statusRef.current !== "idle") {
        socket.emit("call:sync", {
          callId,
          to: target.id,
          from: currentUserId,
          callType: callTypeRef.current,
        });
      }
    };

    const onDisconnect = () => {
      if (callIdRef.current && statusRef.current !== "idle") {
        finishCall("ended");
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [currentUserId, finishCall]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || statusRef.current !== "ringing") return;
    const { callId, from, fromName, type } = incomingCall;

    isCallerRef.current = false;
    callIdRef.current = callId;
    callTypeRef.current = type;
    peerRef.current = { id: from, name: fromName };

    setCallType(type);
    setPeer({ id: from, name: fromName });
    setIncomingCall(null);
    media.updateStatus("connecting");

    try {
      await getRtcConfiguration(true);
      const stream = await media.getLocalMedia(type);
      const pc = media.createPeerConnection(from, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      socket.emit("call:accept", { callId, to: from, from: currentUserId, callType: type });
    } catch (err) {
      console.error("Failed to get local media:", err);
      socket.emit("call:reject", { callId, to: from, from: currentUserId });
      finishCall("rejected");
    }
  }, [currentUserId, finishCall, incomingCall, media]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const { startCall, rejectCall, endCall } = useCallSignaling({
    currentUserId,
    currentUserName,
    incomingCall,
    setIncomingCall,
    setCallType,
    setPeer,
    refs: {
      statusRef,
      isCallerRef,
      peerRef,
      callTypeRef,
      callIdRef,
      pcRef,
      pendingCandidates,
    },
    media,
  });

  return {
    status,
    callType,
    peer,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
