import { useEffect } from "react";
import type { RefObject } from "react";
import { socket } from "../socket/socket";
import type { GroupCallType } from "../types/callTypes";
import {
  clearExpiredGroupCallSession,
  readGroupCallSession,
} from "../utils/callSession";

export interface GroupCallResumeParams {
  currentUserId: string;
  callIdRef: RefObject<string | null>;
  resumeAttemptedRef: RefObject<boolean>;
  joinCall: (
    callId: string,
    groupId: string,
    type: GroupCallType,
    opts?: { minimized?: boolean }
  ) => Promise<void>;
}

export function useGroupCallResume({
  currentUserId,
  callIdRef,
  resumeAttemptedRef,
  joinCall,
}: GroupCallResumeParams): void {
  useEffect(() => {
    if (!currentUserId) return;

    const resume = () => {
      if (resumeAttemptedRef.current || callIdRef.current) return;

      const saved = readGroupCallSession();
      if (!saved) return;

      resumeAttemptedRef.current = true;

      if (clearExpiredGroupCallSession(saved)) return;

      void joinCall(saved.callId, saved.groupId, saved.type, {
        minimized: saved.minimized,
      });
    };

    if (socket.connected) resume();
    socket.on("connect", resume);
    return () => {
      socket.off("connect", resume);
    };
  }, [currentUserId, joinCall, callIdRef, resumeAttemptedRef]);
}
