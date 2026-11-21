import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import type {
  CallStatus,
  CallType,
  DirectCallTerminalStatus,
  IncomingCall,
} from "../types/callTypes";
import { createPeerConnection } from "./peerConnection";
import type { EmitCandidate } from "./peerConnection";
import {
  disposeMedia as disposeMediaResources,
  getLocalMedia as requestLocalMedia,
} from "./webrtcMedia";
import type { MediaRefs } from "./webrtcMedia";

export { createPeerConnection, flushIceCandidates } from "./peerConnection";
export type { PeerConnectionHandlers } from "./peerConnection";
export { createGroupPeerConnection } from "./webrtcGroup";
export type { GroupPeerConnectionOptions } from "./webrtcGroup";
export { closePeerConnection, disposeMedia, getLocalMedia, stopLocalTracks } from "./webrtcMedia";
export { getRtcConfiguration, preloadRtcConfiguration } from "./rtcConfig";
export type { ConnectionRefs, MediaRefs } from "./webrtcMedia";

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
  emitConnected: (callId: string, to: string) => void;
  emitNetworkFailure: (callId: string, to: string) => void;
}

export interface DirectCallMedia {
  updateStatus: (status: CallStatus) => void;
  disposeMedia: () => void;
  getLocalMedia: (type: CallType) => Promise<MediaStream>;
  cleanupCall: (notify?: boolean) => void;
  finishCall: (status: DirectCallTerminalStatus, reason?: string) => void;
  markConnected: () => void;
  createPeerConnection: (to: string, callId: string) => RTCPeerConnection;
}

export function useDirectCallMedia({
  pcRef, localStreamRef,
  mediaPromiseRef, mediaRequestIdRef,
  remoteStreamRef,
  callIdRef, peerRef,
  callTypeRef, isCallerRef,
  statusRef, pendingCandidatesRef,
  onCallEndedRef, setStatus,
  setCallType, setPeer,
  setIncomingCall, setLocalStream,
  setRemoteStream, setIsMuted,
  setIsCameraOff, emitCandidate,
  emitConnected, emitNetworkFailure,
}: UseDirectCallMediaParams): DirectCallMedia {
  const terminalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedNotifiedRef = useRef(false);

  const updateStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, [statusRef, setStatus]);

  const clearCallTimers = useCallback(() => {
    if (terminalTimerRef.current) clearTimeout(terminalTimerRef.current);
    if (networkTimerRef.current) clearTimeout(networkTimerRef.current);
    terminalTimerRef.current = null;
    networkTimerRef.current = null;
  }, []);

  const disposeCallMedia = useCallback(() => {
    clearCallTimers();
    disposeMediaResources({ localStreamRef, mediaPromiseRef, mediaRequestIdRef }, { pcRef });
    remoteStreamRef.current = null;
    callIdRef.current = null;
    peerRef.current = null;
    callTypeRef.current = null;
    isCallerRef.current = false;
    pendingCandidatesRef.current = [];
    connectedNotifiedRef.current = false;
  }, [
    callIdRef,
    callTypeRef,
    clearCallTimers,
    isCallerRef,
    localStreamRef,
    mediaPromiseRef,
    mediaRequestIdRef,
    pcRef,
    peerRef,
    pendingCandidatesRef,
    remoteStreamRef,
  ]);

  const resetCallState = useCallback(() => {
    setLocalStream(null);
    setRemoteStream(null);
    setCallType(null);
    setPeer(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, [setCallType, setIncomingCall, setIsCameraOff, setIsMuted, setLocalStream, setPeer, setRemoteStream]);

  const cleanupCall = useCallback(
    (notify = true) => {
      disposeCallMedia();
      resetCallState();
      updateStatus("idle");
      if (notify) onCallEndedRef.current?.();
    },
    [disposeCallMedia, onCallEndedRef, resetCallState, updateStatus]
  );

  const finishCall = useCallback(
    (status: DirectCallTerminalStatus) => {
      if (terminalTimerRef.current) return;
      disposeCallMedia();
      resetCallState();
      updateStatus(status);
      terminalTimerRef.current = setTimeout(() => {
        terminalTimerRef.current = null;
        updateStatus("idle");
        onCallEndedRef.current?.();
      }, 1400);
    },
    [disposeCallMedia, onCallEndedRef, resetCallState, updateStatus]
  );

  const markConnected = useCallback(() => {
    if (connectedNotifiedRef.current) return;
    connectedNotifiedRef.current = true;
    if (networkTimerRef.current) {
      clearTimeout(networkTimerRef.current);
      networkTimerRef.current = null;
    }
    updateStatus("connected");
    const callId = callIdRef.current;
    const peer = peerRef.current;
    if (callId && peer) emitConnected(callId, peer.id);
  }, [callIdRef, emitConnected, peerRef, updateStatus]);

  const getLocalMediaForCall = useCallback(
    (type: CallType) =>
      requestLocalMedia(type, { localStreamRef, mediaPromiseRef, mediaRequestIdRef }, setLocalStream),
    [setLocalStream, localStreamRef, mediaPromiseRef, mediaRequestIdRef]
  );

  const createCallPeerConnection = useCallback(
    (to: string, currentCallId: string) => {
      const fail = () => {
        const id = callIdRef.current;
        const peer = peerRef.current;
        if (id && peer) emitNetworkFailure(id, peer.id);
        finishCall("ended");
      };

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
          if (state === "connected") {
            markConnected();
          } else if (state === "failed" || state === "closed") {
            fail();
          } else if (state === "disconnected") {
            if (networkTimerRef.current) clearTimeout(networkTimerRef.current);
            networkTimerRef.current = setTimeout(fail, 6000);
          }
        },
      });
      pcRef.current = pc;
      return pc;
    },
    [
      callIdRef,
      emitCandidate,
      emitNetworkFailure,
      finishCall,
      markConnected,
      pcRef,
      peerRef,
      remoteStreamRef,
      setRemoteStream,
    ]
  );

  return {
    updateStatus,
    disposeMedia: disposeCallMedia,
    getLocalMedia: getLocalMediaForCall,
    cleanupCall,
    finishCall,
    markConnected,
    createPeerConnection: createCallPeerConnection,
  };
}
