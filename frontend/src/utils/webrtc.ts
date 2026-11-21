import { useCallback, useRef } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
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
export {
  getRtcConfiguration,
  getRtcDiagnostics,
  hasTurnServer,
  preloadRtcConfiguration,
} from "./rtcConfig";
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
  setStartedAt: Dispatch<SetStateAction<number | null>>;
  setIsMuted: (muted: boolean) => void;
  setIsCameraOff: (off: boolean) => void;
  emitCandidate: EmitCandidate;
  emitConnected: (callId: string, to: string) => void;
  emitNetworkFailure: (callId: string, to: string) => void;
  emitIceRestartRequest: (callId: string, to: string) => void;
  emitOffer: (callId: string, to: string, offer: RTCSessionDescriptionInit, callType: CallType | null) => void;
  setMediaUnavailable: (unavailable: { audio: boolean; video: boolean }) => void;
}

export interface DirectCallMedia {
  updateStatus: (status: CallStatus) => void;
  disposeMedia: () => void;
  getLocalMedia: (type: CallType) => Promise<MediaStream>;
  cleanupCall: (notify?: boolean) => void;
  finishCall: (status: DirectCallTerminalStatus, reason?: string) => void;
  markConnected: () => void;
  restartIce: () => Promise<boolean>;
  createPeerConnection: (to: string, callId: string) => RTCPeerConnection;
}

export function useDirectCallMedia({
  pcRef, localStreamRef,
  mediaPromiseRef, mediaRequestIdRef,
  audioUnavailableRef, videoUnavailableRef,
  remoteStreamRef,
  callIdRef, peerRef,
  callTypeRef, isCallerRef,
  statusRef, pendingCandidatesRef,
  onCallEndedRef, setStatus,
  setCallType, setPeer,
  setIncomingCall, setLocalStream,
  setRemoteStream, setStartedAt, setIsMuted,
  setIsCameraOff, emitCandidate,
  emitConnected, emitNetworkFailure, emitIceRestartRequest, emitOffer,
  setMediaUnavailable,
}: UseDirectCallMediaParams): DirectCallMedia {
  const terminalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedNotifiedRef = useRef(false);
  const iceRestartAttemptsRef = useRef(0);
  const lastIceRestartRef = useRef(0);

  const updateStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);

    const now = Date.now();
    if (next === "calling" || next === "ringing") {
      setStartedAt(now);
    } else if (next === "connecting") {
      setStartedAt((current) => current ?? now);
    } else if (
      next === "idle" ||
      next === "rejected" ||
      next === "ended" ||
      next === "missed"
    ) {
      setStartedAt(null);
    }
  }, [setStartedAt, setStatus, statusRef]);

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
    iceRestartAttemptsRef.current = 0;
    lastIceRestartRef.current = 0;
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
    setMediaUnavailable({ audio: false, video: false });
  }, [setCallType, setIncomingCall, setIsCameraOff, setIsMuted, setLocalStream, setMediaUnavailable, setPeer, setRemoteStream]);

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
    if (networkTimerRef.current) {
      clearTimeout(networkTimerRef.current);
      networkTimerRef.current = null;
    }
    if (connectedNotifiedRef.current) return;
    connectedNotifiedRef.current = true;
    iceRestartAttemptsRef.current = 0;
    updateStatus("connected");
    const callId = callIdRef.current;
    const peer = peerRef.current;
    if (callId && peer) emitConnected(callId, peer.id);
  }, [callIdRef, emitConnected, peerRef, updateStatus]);

  const getLocalMediaForCall = useCallback(
    (type: CallType) =>
      requestLocalMedia(
        type,
        {
          localStreamRef,
          mediaPromiseRef,
          mediaRequestIdRef,
          audioUnavailableRef,
          videoUnavailableRef,
        },
        setLocalStream,
        {
          allowDeviceFallback: true,
          onUnavailable: (audioUnavailable, videoUnavailable) =>
            setMediaUnavailable({ audio: audioUnavailable, video: videoUnavailable }),
        },
      ),
    [audioUnavailableRef, localStreamRef, mediaPromiseRef, mediaRequestIdRef, setLocalStream, setMediaUnavailable, videoUnavailableRef]
  );

  const isActiveConnection = useCallback(
    (expectedCallId: string, expectedPc: RTCPeerConnection) =>
      callIdRef.current === expectedCallId &&
      pcRef.current === expectedPc &&
      !terminalTimerRef.current,
    [callIdRef, pcRef]
  );

  const failConnection = useCallback(
    (expectedCallId: string, expectedPc: RTCPeerConnection) => {
      if (!isActiveConnection(expectedCallId, expectedPc)) return;
      if (statusRef.current === "idle" || statusRef.current === "rejected" || statusRef.current === "ended" || statusRef.current === "missed") return;
      const peer = peerRef.current;
      if (peer) emitNetworkFailure(expectedCallId, peer.id);
      finishCall("ended");
    },
    [emitNetworkFailure, finishCall, isActiveConnection, peerRef, statusRef]
  );

  const restartIce = useCallback(
    async (expectedCallId?: string, expectedPc?: RTCPeerConnection): Promise<boolean> => {
      const callId = expectedCallId ?? callIdRef.current;
      const pc = expectedPc ?? pcRef.current;
      const target = peerRef.current;
      if (!isCallerRef.current || !pc || !callId || !target) return false;
      if (!isActiveConnection(callId, pc)) return false;
      if (pc.signalingState !== "stable" || iceRestartAttemptsRef.current >= 2) return false;
      if (Date.now() - lastIceRestartRef.current < 8000) return false;

      iceRestartAttemptsRef.current += 1;
      lastIceRestartRef.current = Date.now();
      try {
        (pc as RTCPeerConnection & { restartIce?: () => void }).restartIce?.();
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        if (!isActiveConnection(callId, pc)) return false;
        emitOffer(callId, target.id, { type: offer.type, sdp: offer.sdp }, callTypeRef.current);
        return true;
      } catch (error) {
        console.warn("ICE restart failed", error);
        return false;
      }
    },
    [callIdRef, callTypeRef, emitOffer, isActiveConnection, isCallerRef, pcRef, peerRef]
  );

  const recoverConnection = useCallback(
    (expectedCallId: string, expectedPc: RTCPeerConnection, to: string) => {
      if (!isActiveConnection(expectedCallId, expectedPc)) return;
      void restartIce(expectedCallId, expectedPc).then((restarted) => {
        if (!isActiveConnection(expectedCallId, expectedPc)) return;
        if (!restarted && !isCallerRef.current) {
          emitIceRestartRequest(expectedCallId, to);
        }
        networkTimerRef.current = setTimeout(
          () => failConnection(expectedCallId, expectedPc),
          15000,
        );
      });
    },
    [emitIceRestartRequest, failConnection, isActiveConnection, isCallerRef, restartIce]
  );

  const createCallPeerConnection = useCallback(
    (to: string, currentCallId: string) => {
      const pc = createPeerConnection({
        onCandidate: (candidate) => emitCandidate(currentCallId, to, candidate),
        onTrack: (event) => {
          if (callIdRef.current !== currentCallId || pcRef.current !== pc) return;
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          const stream = remoteStreamRef.current;
          if (!stream.getTracks().some((track) => track.id === event.track.id)) {
            stream.addTrack(event.track);
          }
          setRemoteStream(new MediaStream(stream.getTracks()));
        },
        onConnectionChange: (state) => {
          if (state === "connected") {
            if (isActiveConnection(currentCallId, pc)) markConnected();
          } else if (state === "failed") {
            recoverConnection(currentCallId, pc, to);
          } else if (state === "closed") {
            failConnection(currentCallId, pc);
          } else if (state === "disconnected") {
            if (networkTimerRef.current) clearTimeout(networkTimerRef.current);
            networkTimerRef.current = setTimeout(() => recoverConnection(currentCallId, pc, to), 5000);
          }
        },
      });
      pcRef.current = pc;
      return pc;
    },
    [
      callIdRef,
      emitCandidate,
      failConnection,
      isActiveConnection,
      markConnected,
      pcRef,
      recoverConnection,
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
    restartIce,
    createPeerConnection: createCallPeerConnection,
  };
}
