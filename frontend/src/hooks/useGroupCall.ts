import { useEffect, useRef, useState } from "react";
import type {
  ActiveGroupCall,
  GroupCallType,
  GroupCallUIStatus,
  IncomingGroupCall,
  ParticipantState,
} from "../types/callTypes";
import { useGroupCallActions } from "./useGroupCallActions";
import { useGroupCallResume, useGroupCallSession } from "./useGroupCallSession";
import { useGroupCallSignaling } from "./useGroupCallSignaling";

export type { ActiveGroupCall, GroupCallType, GroupCallUIStatus } from "../types/callTypes";

interface UseGroupCallParams {
  currentUserId: string;
  currentUserName: string;
  onCallEnded?: () => void;
}

export function useGroupCall({
  currentUserId,
  currentUserName,
  onCallEnded,
}: UseGroupCallParams) {
  const [status, setStatus] = useState<GroupCallUIStatus>("idle");
  const [callType, setCallType] = useState<GroupCallType | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingGroupCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(
    new Map()
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const callIdRef = useRef<string | null>(null);
  const groupIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<GroupCallType | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const activeCallsRef = useRef<Map<string, ActiveGroupCall>>(new Map());
  const onCallEndedRef = useRef(onCallEnded);
  const resumeAttemptedRef = useRef(false);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  const {
    getLocalMedia,
    activeGroupCalls,
    untrackActiveGroupCall,
    setMinimized,
    goInCall,
    cleanupAll,
  } = useGroupCallSession({
    status,
    callType,
    callIdRef,
    groupIdRef,
    callTypeRef,
    localStreamRef,
    mediaPromiseRef,
    pcMapRef,
    pendingCandidatesRef,
    activeCallsRef,
    onCallEndedRef,
    setStatus,
    setStartedAt,
    setLocalStream,
    setParticipants,
    setCallType,
    setGroupId,
    setIncomingCall,
    setIsMuted,
    setIsCameraOff,
    setIsMinimized,
  });

  const {
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
  } = useGroupCallActions({
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
  });

  useGroupCallResume({
    currentUserId,
    callIdRef,
    resumeAttemptedRef,
    joinCall,
  });

  useGroupCallSignaling({
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
  });

  return {
    status,
    callType,
    groupId,
    incomingCall,
    localStream,
    participants: Array.from(participants.values()),
    isMuted,
    isCameraOff,
    startedAt,
    isMinimized,
    activeGroupCalls,
    setMinimized,
    startCall,
    joinActiveCall,
    acceptCall,
    declineCall,
    leaveCall,
    toggleMute,
    toggleCamera,
  };
}
