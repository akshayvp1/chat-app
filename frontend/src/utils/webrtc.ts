import { useCallback } from "react";
import type { RefObject } from "react";
import type { CallStatus, CallType, IncomingCall } from "../types/callTypes";
import {
  disposeMedia as disposeMediaResources,
  getLocalMedia as requestLocalMedia,
} from "./webrtcMedia";
import type { MediaRefs } from "./webrtcMedia";

export { closePeerConnection, disposeMedia, getLocalMedia, stopLocalTracks } from "./webrtcMedia";
export type { ConnectionRefs, MediaRefs } from "./webrtcMedia";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TURN goes here. Without it, a real share of calls connect and
    // then show black video.
  ],
};

export interface PeerConnectionHandlers {
  onCandidate: (candidate: RTCIceCandidate) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onConnectionChange?: (state: RTCPeerConnectionState) => void;
}

export function createPeerConnection(handlers: PeerConnectionHandlers): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) handlers.onCandidate(event.candidate);
  };
  pc.ontrack = (event) => handlers.onTrack(event);
  pc.onconnectionstatechange = () => {
    handlers.onConnectionChange?.(pc.connectionState);
  };

  return pc;
}

export async function flushIceCandidates(pc: RTCPeerConnection, candidates: RTCIceCandidateInit[]): Promise<void> {
  for (const candidate of candidates) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

type EmitCandidate = (callId: string, to: string, candidate: RTCIceCandidate) => void;

export interface GroupPeerConnectionOptions {
  peerId: string;
  callId: string;
  pcMapRef: RefObject<Map<string, RTCPeerConnection>>;
  localStreamRef: RefObject<MediaStream | null>;
  emitCandidate: EmitCandidate;
  onTrack: (peerId: string, stream: MediaStream) => void;
  onConnectionLost: (peerId: string) => void;
}

export function createGroupPeerConnection(options: GroupPeerConnectionOptions): RTCPeerConnection {
  const { peerId, callId, pcMapRef, localStreamRef, emitCandidate, onTrack, onConnectionLost } = options;
  const existing = pcMapRef.current.get(peerId);
  if (existing) return existing;

  const pc = createPeerConnection({
    onCandidate: (candidate) => emitCandidate(callId, peerId, candidate),
    onTrack: (event) => onTrack(peerId, event.streams[0]),
    onConnectionChange: (state) => {
      if (state === "failed" || state === "closed") onConnectionLost(peerId);
    },
  });

  const localStream = localStreamRef.current;
  localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));
  pcMapRef.current.set(peerId, pc);
  return pc;
}

export interface UseDirectCallMediaParams extends MediaRefs {
  pcRef: RefObject<RTCPeerConnection | null>;
  remoteStreamRef: RefObject<MediaStream | null>;
  callIdRef: RefObject<string | null>;
  peerRef: RefObject<{ id: string; name: string } | null>;
  callTypeRef: RefObject<CallType | null>;
  isCallerRef: RefObject<boolean>;
  statusRef: RefObject<CallStatus>;
  pendingCandidatesRef: RefObject<RTCIceCandidateInit[]>;
  onCallEndedRef: RefObject<(() => void) | undefined>;
  setStatus: (status: CallStatus) => void;
  setCallType: (type: CallType | null) => void;
  setPeer: (peer: { id: string; name: string } | null) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setIsMuted: (muted: boolean) => void;
  setIsCameraOff: (off: boolean) => void;
  emitCandidate: EmitCandidate;
}

export interface DirectCallMedia {
  updateStatus: (status: CallStatus) => void;
  disposeMedia: () => void;
  getLocalMedia: (type: CallType) => Promise<MediaStream>;
  cleanupCall: (notify?: boolean) => void;
  createPeerConnection: (to: string, callId: string) => RTCPeerConnection;
}

export function useDirectCallMedia({
  pcRef, localStreamRef,
  mediaPromiseRef, remoteStreamRef,
  callIdRef, peerRef,
  callTypeRef, isCallerRef,
  statusRef, pendingCandidatesRef,
  onCallEndedRef, setStatus,
  setCallType, setPeer,
  setIncomingCall, setLocalStream,
  setRemoteStream, setIsMuted,
  setIsCameraOff, emitCandidate,
}: UseDirectCallMediaParams): DirectCallMedia {
  const updateStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, [statusRef, setStatus]);

  const disposeCallMedia = useCallback(() => {
    disposeMediaResources({ localStreamRef, mediaPromiseRef }, { pcRef });
    remoteStreamRef.current = null;
    callIdRef.current = null;
    peerRef.current = null;
    callTypeRef.current = null;
    isCallerRef.current = false;
    pendingCandidatesRef.current = [];
  }, [
    callIdRef,
    callTypeRef,
    isCallerRef,
    localStreamRef,
    mediaPromiseRef,
    pcRef,
    peerRef,
    pendingCandidatesRef,
    remoteStreamRef,
  ]);
  const cleanupCall = useCallback(
    (notify = true) => {
      disposeCallMedia();
      setLocalStream(null);
      setRemoteStream(null);
      updateStatus("idle");
      setCallType(null);
      setPeer(null);
      setIncomingCall(null);
      setIsMuted(false);
      setIsCameraOff(false);
      if (notify) onCallEndedRef.current?.();
    },
    [disposeCallMedia, updateStatus, setLocalStream, setRemoteStream, setCallType, setPeer, setIncomingCall, setIsMuted, setIsCameraOff, onCallEndedRef]
  );
  const getLocalMediaForCall = useCallback(
    (type: CallType) =>
      requestLocalMedia(type, { localStreamRef, mediaPromiseRef }, setLocalStream),
    [setLocalStream, localStreamRef, mediaPromiseRef]
  );
  const createCallPeerConnection = useCallback(
    (to: string, currentCallId: string) => {
      const pc = createPeerConnection({
        onCandidate: (candidate) => emitCandidate(currentCallId, to, candidate),
        onTrack: (event) => {
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          const stream = remoteStreamRef.current;
          if (!stream.getTracks().some((track) => track.id === event.track.id)) {
            stream.addTrack(event.track);
          }
          setRemoteStream(new MediaStream(stream.getTracks()));
        },
        onConnectionChange: (state) => {
          if (state === "disconnected" || state === "failed") cleanupCall();
        },
      });
      pcRef.current = pc;
      return pc;
    },
    [emitCandidate, cleanupCall, setRemoteStream, pcRef, remoteStreamRef]
  );

  return {
    updateStatus,
    disposeMedia: disposeCallMedia,
    getLocalMedia: getLocalMediaForCall,
    cleanupCall,
    createPeerConnection: createCallPeerConnection,
  };
}
