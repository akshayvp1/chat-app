import type { RefObject } from "react";
import type { CallType } from "../types/callTypes";

export interface MediaRefs {
  localStreamRef: RefObject<MediaStream | null>;
  mediaPromiseRef: RefObject<Promise<MediaStream> | null>;
}

export interface ConnectionRefs {
  pcRef?: RefObject<RTCPeerConnection | null>;
  pcMapRef?: RefObject<Map<string, RTCPeerConnection>>;
  pendingCandidatesRef?: RefObject<Map<string, RTCIceCandidateInit[]>>;
}

export function getLocalMedia(type: CallType, refs: MediaRefs, setLocalStream: (stream: MediaStream | null) => void): Promise<MediaStream> {
  if (refs.localStreamRef.current) {
    return Promise.resolve(refs.localStreamRef.current);
  }
  if (refs.mediaPromiseRef.current) return refs.mediaPromiseRef.current;

  const promise = navigator.mediaDevices
    .getUserMedia({ audio: true, video: type === "video" })
    .then((stream) => {
      refs.localStreamRef.current = stream;
      setLocalStream(stream);
      refs.mediaPromiseRef.current = null;
      return stream;
    })
    .catch((err) => {
      refs.mediaPromiseRef.current = null;
      throw err;
    });

  refs.mediaPromiseRef.current = promise;
  return promise;
}

export function stopLocalTracks(refs: MediaRefs): void {
  refs.localStreamRef.current?.getTracks().forEach((track) => track.stop());
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
