import type { RefObject } from "react";
import { createPeerConnection, type EmitCandidate } from "./peerConnection";

export interface GroupPeerConnectionOptions {
  peerId: string;
  callId: string;
  pcMapRef: RefObject<Map<string, RTCPeerConnection>>;
  localStreamRef: RefObject<MediaStream | null>;
  emitCandidate: EmitCandidate;
  onTrack: (peerId: string, stream: MediaStream) => void;
  onConnectionLost: (peerId: string) => void;
}

export function createGroupPeerConnection(
  options: GroupPeerConnectionOptions,
): RTCPeerConnection {
  const {
    peerId,
    callId,
    pcMapRef,
    localStreamRef,
    emitCandidate,
    onTrack,
    onConnectionLost,
  } = options;
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
