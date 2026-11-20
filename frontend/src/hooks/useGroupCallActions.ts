import { useCallback } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { socket } from "../socket/socket";
import type {
  ActiveGroupCall,
  GroupCallType,
  GroupCallUIStatus,
  IncomingGroupCall,
  ParticipantState,
} from "../types/callTypes";
import { closePeerConnection, createGroupPeerConnection } from "../utils/webrtc";

export interface GroupCallActionsParams {
  currentUserId: string;
  currentUserName: string;
  incomingCall: IncomingGroupCall | null;
  callIdRef: RefObject<string | null>;
  groupIdRef: RefObject<string | null>;
  callTypeRef: RefObject<GroupCallType | null>;
  localStreamRef: RefObject<MediaStream | null>;
  activeCallsRef: RefObject<Map<string, ActiveGroupCall>>;
  pcMapRef: RefObject<Map<string, RTCPeerConnection>>;
  pendingCandidatesRef: RefObject<Map<string, RTCIceCandidateInit[]>>;
  setStatus: (status: GroupCallUIStatus) => void;
  setCallType: (type: GroupCallType | null) => void;
  setGroupId: (groupId: string | null) => void;
  setIncomingCall: (call: IncomingGroupCall | null) => void;
  setParticipants: Dispatch<SetStateAction<Map<string, ParticipantState>>>;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  setIsCameraOff: Dispatch<SetStateAction<boolean>>;
  getLocalMedia: (type: GroupCallType) => Promise<MediaStream>;
  setMinimized: (value: boolean) => void;
  goInCall: () => void;
  cleanupAll: () => void;
}

export function useGroupCallActions({
  currentUserId,
  currentUserName,
  incomingCall,
  callIdRef,
  groupIdRef,
  callTypeRef,
  localStreamRef,
  activeCallsRef,
  pcMapRef,
  pendingCandidatesRef,
  setStatus,
  setCallType,
  setGroupId,
  setIncomingCall,
  setParticipants,
  setIsMuted,
  setIsCameraOff,
  getLocalMedia,
  setMinimized,
  goInCall,
  cleanupAll,
}: GroupCallActionsParams) {
  const upsertParticipant = useCallback(
    (userId: string, patch: Partial<ParticipantState>) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(userId) ?? {
          userId,
          name: "Unknown",
          stream: null,
        };
        next.set(userId, { ...existing, ...patch });
        return next;
      });
    },
    [setParticipants]
  );

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    const pc = pcMapRef.current.get(userId);
    if (pc) {
      closePeerConnection(pc);
      pcMapRef.current.delete(userId);
    }
    pendingCandidatesRef.current.delete(userId);
  }, [setParticipants, pcMapRef, pendingCandidatesRef]);

  const createPeerConnection = useCallback(
    (peerId: string, currentCallId: string) =>
      createGroupPeerConnection({
        peerId,
        callId: currentCallId,
        pcMapRef,
        localStreamRef,
        emitCandidate: (callId, to, candidate) =>
          socket.emit("group_call:ice-candidate", { callId, to, candidate }),
        onTrack: (peerId, stream) => upsertParticipant(peerId, { stream }),
        onConnectionLost: removeParticipant,
      }),
    [upsertParticipant, removeParticipant, localStreamRef, pcMapRef]
  );

  const startCall = useCallback(
    (targetGroupId: string, type: GroupCallType) => {
      const newCallId = `group_${targetGroupId}_${Date.now()}`;

      callIdRef.current = newCallId;
      callTypeRef.current = type;
      groupIdRef.current = targetGroupId;

      setCallType(type);
      setGroupId(targetGroupId);
      setStatus("connecting");

      socket.emit("group_call:initiate", {
        callId: newCallId,
        groupId: targetGroupId,
        from: currentUserId,
        fromName: currentUserName,
        type,
      });
    },
    [
      currentUserId,
      currentUserName,
      callIdRef,
      callTypeRef,
      groupIdRef,
      setCallType,
      setGroupId,
      setStatus,
    ]
  );

  const joinCall = useCallback(
    async (callId: string, targetGroupId: string, type: GroupCallType, opts?: { minimized?: boolean }) => {
      try {
        callIdRef.current = callId;
        groupIdRef.current = targetGroupId;
        callTypeRef.current = type;

        setCallType(type);
        setGroupId(targetGroupId);
        setIncomingCall(null);

        await getLocalMedia(type);
        goInCall();
        if (opts?.minimized) setMinimized(true);

        socket.emit("group_call:join", {
          callId,
          groupId: targetGroupId,
          userId: currentUserId,
          userName: currentUserName,
        });
      } catch (err) {
        console.error("Failed to join group call:", err);
        cleanupAll();
      }
    },
    [
      currentUserId,
      currentUserName,
      getLocalMedia,
      goInCall,
      setMinimized,
      cleanupAll,
      callIdRef,
      callTypeRef,
      groupIdRef,
      setCallType,
      setGroupId,
      setIncomingCall,
    ]
  );

  /**
   * Join a call already running in a group — this is the Join button.
   * Works whether you declined the ring, left earlier, or never got one.
   */
  const joinActiveCall = useCallback(
    (targetGroupId: string) => {
      if (callIdRef.current) return;
      const active = activeCallsRef.current.get(targetGroupId);
      if (!active) return;
      joinCall(active.callId, targetGroupId, active.type);
    },
    [joinCall, activeCallsRef, callIdRef]
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    joinCall(incomingCall.callId, incomingCall.groupId, incomingCall.type);
  }, [incomingCall, joinCall]);

  const declineCall = useCallback(() => {
    setIncomingCall(null);
    setStatus("idle");
    callIdRef.current = null;
    groupIdRef.current = null;
    callTypeRef.current = null;
  }, [callIdRef, callTypeRef, groupIdRef, setIncomingCall, setStatus]);

  const leaveCall = useCallback(() => {
    if (callIdRef.current && groupIdRef.current) {
      socket.emit("group_call:leave", {
        callId: callIdRef.current,
        groupId: groupIdRef.current,
        userId: currentUserId,
      });
    }
    cleanupAll();
  }, [currentUserId, cleanupAll, callIdRef, groupIdRef]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, [localStreamRef, setIsMuted]);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, [localStreamRef, setIsCameraOff]);

  return {
    upsertParticipant,
    removeParticipant,
    createPeerConnection,
    startCall,
    joinCall,
    joinActiveCall,
    acceptCall,
    declineCall,
    leaveCall,
    toggleMute,
    toggleCamera,
  };
}
