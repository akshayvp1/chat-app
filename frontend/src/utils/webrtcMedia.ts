import type { RefObject } from "react";
import type { CallType } from "../types/callTypes";

export interface MediaRefs {
  localStreamRef: RefObject<MediaStream | null>;
  mediaPromiseRef: RefObject<Promise<MediaStream> | null>;
  mediaRequestIdRef?: RefObject<number>;
}

export interface ConnectionRefs {
  pcRef?: RefObject<RTCPeerConnection | null>;
  pcMapRef?: RefObject<Map<string, RTCPeerConnection>>;
  pendingCandidatesRef?: RefObject<Map<string, RTCIceCandidateInit[]>>;
}

function streamHasRequiredTracks(stream: MediaStream, type: CallType): boolean {
  const hasAudio = stream.getAudioTracks().some((track) => track.readyState === "live");
  const hasVideo = stream.getVideoTracks().some((track) => track.readyState === "live");
  return hasAudio && (type === "audio" || hasVideo);
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function getLocalMedia(
  type: CallType,
  refs: MediaRefs,
  setLocalStream: (stream: MediaStream | null) => void,
): Promise<MediaStream> {
  const current = refs.localStreamRef.current;
  if (current && streamHasRequiredTracks(current, type)) {
    return Promise.resolve(current);
  }
  if (current) {
    stopStream(current);
    refs.localStreamRef.current = null;
    setLocalStream(null);
  }
  if (refs.mediaPromiseRef.current) return refs.mediaPromiseRef.current;

  if (refs.mediaRequestIdRef) {
    refs.mediaRequestIdRef.current += 1;
  }
  const requestId = refs.mediaRequestIdRef?.current ?? 0;

  const promise: Promise<MediaStream> = (async () => {
    let stream: MediaStream | null = null;

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
      } catch (error) {
        if (type === "video") {
          throw new Error("Camera access is required for a video call", { cause: error });
        }
        throw error;
      }
    }

    if (!stream) throw new Error("Media devices are unavailable");

    if (refs.mediaRequestIdRef && refs.mediaRequestIdRef.current !== requestId) {
      stopStream(stream);
      throw new Error("Media request cancelled");
    }

    refs.localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  })().finally(() => {
    if (refs.mediaPromiseRef.current === promise) {
      refs.mediaPromiseRef.current = null;
    }
  });

  refs.mediaPromiseRef.current = promise;
  return promise;
}

export function stopLocalTracks(refs: MediaRefs): void {
  if (refs.mediaRequestIdRef) {
    refs.mediaRequestIdRef.current += 1;
  }
  stopStream(refs.localStreamRef.current);
  refs.localStreamRef.current = null;
  refs.mediaPromiseRef.current = null;
}

function closeSimplePeerConnection(pc: RTCPeerConnection | null): void {
  if (!pc) return;
  pc.onicecandidate = null;
  pc.ontrack = null;
  pc.onconnectionstatechange = null;
  pc.oniceconnectionstatechange = null;
  pc.onicegatheringstatechange = null;
  pc.onsignalingstatechange = null;
  pc.close();
}

/** Close a connection without stopping the shared local tracks. */
export function closePeerConnection(pc: RTCPeerConnection): void {
  pc.onicecandidate = null;
  pc.ontrack = null;
  pc.onconnectionstatechange = null;
  pc.oniceconnectionstatechange = null;
  pc.onicegatheringstatechange = null;
  pc.onsignalingstatechange = null;
  pc.getSenders().forEach((sender) => {
    try {
      pc.removeTrack(sender);
    } catch {
      /* already closed */
    }
  });
  pc.close();
}

export function disposeMedia(refs: MediaRefs, connections: ConnectionRefs): void {
  if (connections.pcRef) {
    closeSimplePeerConnection(connections.pcRef.current);
    connections.pcRef.current = null;
  }
  if (connections.pcMapRef && connections.pendingCandidatesRef) {
    connections.pcMapRef.current.forEach(closePeerConnection);
    connections.pcMapRef.current.clear();
    connections.pendingCandidatesRef.current.clear();
  }
  stopLocalTracks(refs);
}
