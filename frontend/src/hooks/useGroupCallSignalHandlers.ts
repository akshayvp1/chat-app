import type { RefObject } from "react";
import { socket } from "../socket/socket";
import type {
  GroupCallType,
  GroupCallUIStatus,
  IncomingGroupCall,
  ParticipantState,
} from "../types/callTypes";
import { flushIceCandidates } from "../utils/webrtc";

type JoinCall = (callId: string, groupId: string, type: GroupCallType, opts?: { minimized?: boolean }) => Promise<void>;
type CreatePeerConnection = (peerId: string, callId: string) => RTCPeerConnection;
type UpsertParticipant = (userId: string, patch: Partial<ParticipantState>) => void;

export interface UseGroupCallSignalingParams {
  currentUserId: string;
  callIdRef: RefObject<string | null>;
  groupIdRef: RefObject<string | null>;
  callTypeRef: RefObject<GroupCallType | null>;
  pcMapRef: RefObject<Map<string, RTCPeerConnection>>;
  pendingCandidatesRef: RefObject<Map<string, RTCIceCandidateInit[]>>;
  setIncomingCall: (call: IncomingGroupCall | null) => void;
  setStatus: (status: GroupCallUIStatus) => void;
  setCallType: (type: GroupCallType | null) => void;
  setGroupId: (groupId: string | null) => void;
  joinCall: JoinCall;
  leaveCall: () => void;
  getLocalMedia: (type: GroupCallType) => Promise<MediaStream>;
  goInCall: () => void;
  createPeerConnection: CreatePeerConnection;
  upsertParticipant: UpsertParticipant;
  removeParticipant: (userId: string) => void;
  cleanupAll: () => void;
  untrackActiveGroupCall: (groupId: string) => void;
}

export function createGroupCallSignalHandlers({
  currentUserId,
  callIdRef,
  groupIdRef,
  callTypeRef,
  pcMapRef,
  pendingCandidatesRef,
  setIncomingCall,
  setStatus,
  setCallType,
  setGroupId,
  joinCall,
  leaveCall,
  getLocalMedia,
  goInCall,
  createPeerConnection,
  upsertParticipant,
  removeParticipant,
  cleanupAll,
  untrackActiveGroupCall,
}: UseGroupCallSignalingParams) {
  function isBusy() {
    return callIdRef.current !== null;
  }

  async function onInitiated(data: {
    callId: string;
    groupId: string;
    type: GroupCallType;
  }) {
    try {
      callIdRef.current = data.callId;
      groupIdRef.current = data.groupId;
      callTypeRef.current = data.type;
      setCallType(data.type);
      setGroupId(data.groupId);
      setIncomingCall(null);
      await getLocalMedia(data.type);
      goInCall();
    } catch (err) {
      console.error("Failed to acquire local media:", err);
      leaveCall();
    }
  }

  function onJoinExisting(data: {
    callId: string;
    groupId: string;
    type: GroupCallType;
  }) {
    joinCall(data.callId, data.groupId, data.type);
  }

  function onIncoming(data: IncomingGroupCall) {
    if (isBusy()) return;
    setIncomingCall(data);
    setStatus("incoming");
  }

  async function onExistingParticipants(data: {
    callId: string;
    participants: { userId: string; userName: string }[];
  }) {
    if (callTypeRef.current) await getLocalMedia(callTypeRef.current);

    for (const p of data.participants) {
      if (p.userId === currentUserId) continue;
      upsertParticipant(p.userId, { name: p.userName, stream: null });
      try {
        const pc = createPeerConnection(p.userId, data.callId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("group_call:offer", {
          callId: data.callId,
          to: p.userId,
          offer,
        });
      } catch (err) {
        console.error("Failed to create offer for", p.userId, err);
      }
    }
  }

  function onUserJoined(data: {
    callId: string;
    userId: string;
    userName: string;
  }) {
    if (data.userId === currentUserId) return;
    upsertParticipant(data.userId, { name: data.userName, stream: null });
  }

  function onUserLeft(data: { callId: string; userId: string }) {
    removeParticipant(data.userId);
  }

  async function onOffer(data: {
    callId: string;
    from: string;
    offer: RTCSessionDescriptionInit;
  }) {
    try {
      if (callTypeRef.current) await getLocalMedia(callTypeRef.current);

      const pc = createPeerConnection(data.from, data.callId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      await flushIceCandidates(pc, pendingCandidatesRef.current.get(data.from) ?? []);
      pendingCandidatesRef.current.delete(data.from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("group_call:answer", {
        callId: data.callId,
        to: data.from,
        answer,
      });
    } catch (err) {
      console.error("Failed to answer offer from", data.from, err);
    }
  }

  async function onAnswer(data: {
    from: string;
    answer: RTCSessionDescriptionInit;
  }) {
    const pc = pcMapRef.current.get(data.from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      await flushIceCandidates(pc, pendingCandidatesRef.current.get(data.from) ?? []);
      pendingCandidatesRef.current.delete(data.from);
    } catch (err) {
      console.error("Failed to apply answer from", data.from, err);
    }
  }

  async function onIceCandidate(data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) {
    const pc = pcMapRef.current.get(data.from);
    if (pc?.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Failed to add ICE candidate", err);
      }
    } else {
      const queued = pendingCandidatesRef.current.get(data.from) ?? [];
      queued.push(data.candidate);
      pendingCandidatesRef.current.set(data.from, queued);
    }
  }

  /**
   * Scoped on purpose. This event now reaches every group member so the
   * Join button can disappear, so it must only tear down my session when
   * the ended call is the one I'm actually in.
   */
  function onEnded(data?: { callId?: string; groupId?: string }) {
    if (data?.groupId) untrackActiveGroupCall(data.groupId);
    if (!data?.callId || data.callId === callIdRef.current) cleanupAll();
  }

  function onUnavailable(data?: { callId?: string }) {
    if (!data?.callId || data.callId === callIdRef.current) cleanupAll();
  }

  return {
    onInitiated,
    onJoinExisting,
    onIncoming,
    onExistingParticipants,
    onUserJoined,
    onUserLeft,
    onOffer,
    onAnswer,
    onIceCandidate,
    onEnded,
    onUnavailable,
  };
}
