import { getCurrentRtcConfiguration } from "./rtcConfig";

export interface PeerConnectionHandlers {
  onCandidate: (candidate: RTCIceCandidate) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onConnectionChange?: (state: RTCPeerConnectionState) => void;
}

export type EmitCandidate = (
  callId: string,
  to: string,
  candidate: RTCIceCandidate,
) => void;

export function createPeerConnection(
  handlers: PeerConnectionHandlers,
): RTCPeerConnection {
  const pc = new RTCPeerConnection(getCurrentRtcConfiguration());

  pc.onicecandidate = (event) => {
    if (event.candidate) handlers.onCandidate(event.candidate);
  };
  pc.ontrack = (event) => handlers.onTrack(event);
  pc.onconnectionstatechange = () => {
    handlers.onConnectionChange?.(pc.connectionState);
  };

  return pc;
}

export async function flushIceCandidates(
  pc: RTCPeerConnection,
  candidates: RTCIceCandidateInit[],
): Promise<void> {
  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn("Dropped ICE candidate:", error);
    }
  }
}
