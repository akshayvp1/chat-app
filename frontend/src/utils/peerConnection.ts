import { getCurrentRtcConfiguration, getRtcDiagnostics } from "./rtcConfig";

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

let warnedNoTurn = false;

type CandidateStats = RTCStats & { candidateType?: string };
type CandidatePairStats = RTCIceCandidatePairStats & {
  protocol?: string;
  relayProtocol?: string;
};

async function logSelectedCandidatePair(pc: RTCPeerConnection): Promise<void> {
  try {
    const stats = await pc.getStats();
    let selectedPairId: string | undefined;
    stats.forEach((report) => {
      if (report.type === "transport" && !selectedPairId) {
        selectedPairId = report.selectedCandidatePairId;
      }
    });
    const pair = selectedPairId ? stats.get(selectedPairId) : undefined;
    if (!pair || pair.type !== "candidate-pair") return;
    const candidatePair = pair as CandidatePairStats;
    const local = stats.get(candidatePair.localCandidateId) as CandidateStats | undefined;
    const remote = stats.get(candidatePair.remoteCandidateId) as CandidateStats | undefined;
    console.info("RTC selected candidate pair", {
      local: local?.candidateType,
      remote: remote?.candidateType,
      protocol: candidatePair.protocol,
      relayProtocol: candidatePair.relayProtocol,
    });
  } catch (error) {
    console.warn("RTC stats unavailable", error);
  }
}

export function createPeerConnection(
  handlers: PeerConnectionHandlers,
): RTCPeerConnection {
  const diagnostics = getRtcDiagnostics();
  if (!diagnostics.hasTurn && !warnedNoTurn) {
    console.warn("No TURN server configured; cross-network calls may fail", diagnostics.iceServers);
    warnedNoTurn = true;
  }

  const pc = new RTCPeerConnection(getCurrentRtcConfiguration());

  pc.onicecandidate = (event) => {
    if (event.candidate) handlers.onCandidate(event.candidate);
  };
  pc.onicecandidateerror = (event) => {
    const detail = event as Event & { errorCode?: number; errorText?: string };
    console.warn("ICE candidate error", {
      code: detail.errorCode,
      text: detail.errorText,
    });
  };
  pc.ontrack = (event) => handlers.onTrack(event);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") void logSelectedCandidatePair(pc);
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
