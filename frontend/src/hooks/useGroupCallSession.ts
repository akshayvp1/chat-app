import { useCallback, useEffect, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  ActiveGroupCall,
  GroupCallType,
  GroupCallUIStatus,
  IncomingGroupCall,
  ParticipantState,
} from "../types/callTypes";
import type { PersistedGroupCall } from "../utils/callSession";
import {
  clearGroupCallSession,
  groupCallStartedAt,
  persistGroupCallSession,
  readGroupCallSession,
} from "../utils/callSession";
import {
  startGroupIncomingRingtone,
  startGroupOutgoingRingback,
  stopRingtone,
} from "../utils/ringtone";
import {
  disposeMedia as disposeMediaResources,
  getLocalMedia as requestLocalMedia,
} from "../utils/webrtc";
import { useGroupCallResume } from "./useGroupCallResume";
import type { GroupCallResumeParams } from "./useGroupCallResume";

export { useGroupCallResume };
export type { GroupCallResumeParams };

export interface GroupCallSessionParams {
  status: GroupCallUIStatus;
  callType: GroupCallType | null;
  callIdRef: RefObject<string | null>;
  groupIdRef: RefObject<string | null>;
  callTypeRef: RefObject<GroupCallType | null>;
  localStreamRef: RefObject<MediaStream | null>;
  mediaPromiseRef: RefObject<Promise<MediaStream> | null>;
  mediaRequestIdRef: RefObject<number>;
  pcMapRef: RefObject<Map<string, RTCPeerConnection>>;
  pendingCandidatesRef: RefObject<Map<string, RTCIceCandidateInit[]>>;
  activeCallsRef: RefObject<Map<string, ActiveGroupCall>>;
  onCallEndedRef: RefObject<(() => void) | undefined>;
  setStatus: (status: GroupCallUIStatus) => void;
  setStartedAt: (startedAt: number | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setParticipants: (participants: Map<string, ParticipantState>) => void;
  setCallType: (type: GroupCallType | null) => void;
  setGroupId: (groupId: string | null) => void;
  setIncomingCall: (call: IncomingGroupCall | null) => void;
  setIsMuted: (muted: boolean) => void;
  setIsCameraOff: (off: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
}

export interface GroupCallSessionResult {
  disposeMedia: () => void;
  getLocalMedia: (type: GroupCallType) => Promise<MediaStream>;
  activeGroupCalls: Map<string, ActiveGroupCall>;
  setActiveGroupCalls: Dispatch<SetStateAction<Map<string, ActiveGroupCall>>>;
  untrackActiveGroupCall: (groupId: string) => void;
  persist: (patch?: Partial<PersistedGroupCall>) => void;
  setMinimized: (value: boolean) => void;
  goInCall: () => void;
  cleanupAll: () => void;
}

export function useGroupCallSession({
  status,
  callType,
  callIdRef,
  groupIdRef,
  callTypeRef,
  localStreamRef,
  mediaPromiseRef,
  mediaRequestIdRef,
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
}: GroupCallSessionParams): GroupCallSessionResult {
  /**
   * groupId -> running call. Kept in sync by the server for every group
   * the user belongs to, independent of participation. This is what the
   * "Join" banner reads, so leaving a call no longer hides it from you.
   */
  const [activeGroupCalls, setActiveGroupCalls] = useState<
    Map<string, ActiveGroupCall>
  >(new Map());

  useEffect(() => {
    activeCallsRef.current = activeGroupCalls;
  }, [activeGroupCalls, activeCallsRef]);

  useEffect(() => {
    if (status === "incoming") startGroupIncomingRingtone(callType ?? "audio");
    else if (status === "connecting") startGroupOutgoingRingback(callType ?? "audio");
    else stopRingtone("group");
  }, [status, callType]);

  useEffect(() => () => stopRingtone("group"), []);

  const disposeMedia = useCallback(() => {
    disposeMediaResources(
      { localStreamRef, mediaPromiseRef, mediaRequestIdRef },
      { pcMapRef, pendingCandidatesRef }
    );
  }, [localStreamRef, mediaPromiseRef, mediaRequestIdRef, pcMapRef, pendingCandidatesRef]);

  useEffect(
    () => () => {
      stopRingtone("group");
      disposeMedia();
    },
    [disposeMedia]
  );

  const getLocalMedia = useCallback(
    (type: GroupCallType) =>
      requestLocalMedia(type, { localStreamRef, mediaPromiseRef, mediaRequestIdRef }, setLocalStream),
    [setLocalStream, localStreamRef, mediaPromiseRef, mediaRequestIdRef]
  );

  const untrackActiveGroupCall = useCallback((gid: string) => {
    setActiveGroupCalls((prev) => {
      if (!prev.has(gid)) return prev;
      const next = new Map(prev);
      next.delete(gid);
      return next;
    });
  }, []);

  const persist = useCallback(
    (patch: Partial<PersistedGroupCall> = {}) => {
      if (!callIdRef.current || !groupIdRef.current || !callTypeRef.current) {
        return;
      }
      persistGroupCallSession(
        {
          callId: callIdRef.current,
          groupId: groupIdRef.current,
          type: callTypeRef.current,
        },
        patch
      );
    },
    [callIdRef, callTypeRef, groupIdRef]
  );

  const setMinimized = useCallback(
    (value: boolean) => {
      setIsMinimized(value);
      persist({ minimized: value });
    },
    [persist, setIsMinimized]
  );

  const goInCall = useCallback(() => {
    const started = groupCallStartedAt(readGroupCallSession(), callIdRef.current);
    setStartedAt(started);
    setStatus("in-call");
    persist({ startedAt: started });
  }, [persist, callIdRef, setStartedAt, setStatus]);

  const cleanupAll = useCallback(() => {
    stopRingtone("group");
    disposeMedia();

    setLocalStream(null);
    setParticipants(new Map());
    setStatus("idle");
    setCallType(null);
    setGroupId(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setStartedAt(null);
    setIsMinimized(false);

    callIdRef.current = null;
    groupIdRef.current = null;
    callTypeRef.current = null;

    clearGroupCallSession();
    onCallEndedRef.current?.();
  }, [
    disposeMedia,
    callIdRef,
    callTypeRef,
    groupIdRef,
    onCallEndedRef,
    setCallType,
    setGroupId,
    setIncomingCall,
    setIsCameraOff,
    setIsMinimized,
    setIsMuted,
    setLocalStream,
    setParticipants,
    setStartedAt,
    setStatus,
  ]);

  return {
    disposeMedia,
    getLocalMedia,
    activeGroupCalls,
    setActiveGroupCalls,
    untrackActiveGroupCall,
    persist,
    setMinimized,
    goInCall,
    cleanupAll,
  };
}
