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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mediaUnavailable, setMediaUnavailable] = useState({ audio: false, video: false });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");
  const audioUnavailableRef = useRef(false);
  const videoUnavailableRef = useRef(false);
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
      socket.emit("call:end", {
        callId,
        to,
        from: currentUserId,
        callType: callTypeRef.current,
        reason: "network",
      }),
    [currentUserId]
  );

  const emitIceRestartRequest = useCallback(
    (callId: string, to: string) =>
      socket.emit("call:ice-restart", {
        callId,
        to,
        from: currentUserId,
        callType: callTypeRef.current,
      }),
    [currentUserId]
  );

  const emitOffer = useCallback(
    (callId: string, to: string, offer: RTCSessionDescriptionInit, callType: CallType | null) =>
      socket.emit("call:offer", {
        callId,
        to,
        from: currentUserId,
        callType,
        offer: { type: offer.type, sdp: offer.sdp },
      }),
    [currentUserId]
  );

  const media = useDirectCallMedia({
    pcRef,
    localStreamRef,
    mediaPromiseRef,
    mediaRequestIdRef,
    audioUnavailableRef,
    videoUnavailableRef,
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
    setStartedAt,
    setIsMuted,
    setIsCameraOff,
    emitCandidate,
    emitConnected,
    emitNetworkFailure,
    emitIceRestartRequest,
    emitOffer,
    setMediaUnavailable,
  });

  const { disposeMedia, finishCall, restartIce } = media;

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

    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [currentUserId]);

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
      console.error("Failed to start accepted call:", err);
      socket.emit("call:end", {
        callId,
        to: from,
        from: currentUserId,
        callType: type,
        reason: "media",
      });
      finishCall("ended");
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

  const switchCamera = useCallback(async () => {
    if (callTypeRef.current !== "video") return;

    const nextFacingMode =
      facingModeRef.current === "user" ? "environment" : "user";
    const currentStream = localStreamRef.current;
    const currentTrack = currentStream?.getVideoTracks()[0];

    if (!currentStream || !currentTrack) {
      facingModeRef.current = nextFacingMode;
      setFacingMode(nextFacingMode);
      return;
    }

    try {
      await currentTrack.applyConstraints({
        facingMode: { ideal: nextFacingMode },
      });
    } catch {
      let fallbackStream: MediaStream | null = null;
      try {
        fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: nextFacingMode } },
        });
        const nextStream = fallbackStream;
        const nextTrack = nextStream.getVideoTracks()[0];

        if (!nextTrack) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }

        nextTrack.enabled = currentTrack.enabled;
        const sender = pcRef.current
          ?.getSenders()
          .find((candidate) => candidate.track?.kind === "video");
        if (sender) await sender.replaceTrack(nextTrack);

        currentStream.removeTrack(currentTrack);
        currentStream.addTrack(nextTrack);
        currentTrack.stop();
        setLocalStream(new MediaStream(currentStream.getTracks()));
      } catch (error) {
        fallbackStream?.getTracks().forEach((track) => track.stop());
        console.warn("Camera switch failed", error);
        return;
      }
    }

    facingModeRef.current = nextFacingMode;
    setFacingMode(nextFacingMode);
  }, [callTypeRef, localStreamRef, pcRef, setLocalStream]);

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
    restartIce,
  });

  return {
    status,
    callType,
    peer,
    incomingCall,
    localStream,
    remoteStream,
    startedAt,
    isMuted,
    isCameraOff,
    facingMode,
    mediaUnavailable,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  };
}
