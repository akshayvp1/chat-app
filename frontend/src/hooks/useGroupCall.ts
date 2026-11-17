import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import {
  startIncomingRingtone,
  startOutgoingRingback,
  stopRingtone,
} from "../utils/ringtone";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TURN goes here for production.
  ],
};

export type GroupCallType = "audio" | "video";
export type GroupCallUIStatus = "idle" | "incoming" | "connecting" | "in-call";

interface IncomingGroupCall {
  callId: string;
  groupId: string;
  fromName: string;
  type: GroupCallType;
}

interface ParticipantState {
  userId: string;
  name: string;
  stream: MediaStream | null;
}

/** A call running in a group, whether or not I am in it. */
export interface ActiveGroupCall {
  callId: string;
  groupId: string;
  type: GroupCallType;
  participantCount: number;
  startedAt: number;
}

interface UseGroupCallParams {
  currentUserId: string;
  currentUserName: string;
  onCallEnded?: () => void;
}

/* ── session persistence (survives reload) ─────────────────── */

const SESSION_KEY = "active_group_call";
const MAX_RESUME_AGE_MS = 6 * 60 * 60 * 1000;

interface PersistedCall {
  callId: string;
  groupId: string;
  type: GroupCallType;
  startedAt: number;
  minimized: boolean;
}

function readSession(): PersistedCall | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedCall) : null;
  } catch {
    return null;
  }
}

function writeSession(value: PersistedCall) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Close a connection without stopping the shared local tracks. */
function closePeerConnection(pc: RTCPeerConnection) {
  pc.onicecandidate = null;
  pc.ontrack = null;
  pc.onconnectionstatechange = null;
  pc.getSenders().forEach((sender) => {
    try {
      pc.removeTrack(sender);
    } catch {
      /* already closed */
    }
  });
  pc.close();
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

  /**
   * groupId -> running call. Kept in sync by the server for every group
   * the user belongs to, independent of participation. This is what the
   * "Join" banner reads, so leaving a call no longer hides it from you.
   */
  const [activeGroupCalls, setActiveGroupCalls] = useState<
    Map<string, ActiveGroupCall>
  >(new Map());

  const callIdRef = useRef<string | null>(null);
  const groupIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<GroupCallType | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const activeCallsRef = useRef<Map<string, ActiveGroupCall>>(new Map());
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  useEffect(() => {
    activeCallsRef.current = activeGroupCalls;
  }, [activeGroupCalls]);

  useEffect(() => {
    if (status === "incoming") startIncomingRingtone();
    else if (status === "connecting") startOutgoingRingback();
    else stopRingtone();
  }, [status]);

  useEffect(() => () => stopRingtone(), []);

  /* ── persistence ─────────────────────────────────────────── */

  const persist = useCallback((patch: Partial<PersistedCall> = {}) => {
    if (!callIdRef.current || !groupIdRef.current || !callTypeRef.current) return;
    const prev = readSession();
    const same = prev?.callId === callIdRef.current;
    writeSession({
      callId: callIdRef.current,
      groupId: groupIdRef.current,
      type: callTypeRef.current,
      startedAt: same ? prev!.startedAt : Date.now(),
      minimized: same ? prev!.minimized : false,
      ...patch,
    });
  }, []);

  const setMinimized = useCallback(
    (value: boolean) => {
      setIsMinimized(value);
      persist({ minimized: value });
    },
    [persist]
  );

  /* ── participants ────────────────────────────────────────── */

  function upsertParticipant(userId: string, patch: Partial<ParticipantState>) {
    setParticipants((prev) => {
      const next = new Map(prev);
      const existing = next.get(userId) ?? { userId, name: "Unknown", stream: null };
      next.set(userId, { ...existing, ...patch });
      return next;
    });
  }

  function removeParticipant(userId: string) {
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
  }

  /* ── local media ─────────────────────────────────────────── */

  function getLocalMedia(type: GroupCallType): Promise<MediaStream> {
    if (localStreamRef.current) return Promise.resolve(localStreamRef.current);
    if (mediaPromiseRef.current) return mediaPromiseRef.current;

    const p = navigator.mediaDevices
      .getUserMedia({ audio: true, video: type === "video" })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);
        mediaPromiseRef.current = null;
        return stream;
      })
      .catch((err) => {
        mediaPromiseRef.current = null;
        throw err;
      });

    mediaPromiseRef.current = p;
    return p;
  }

  function stopLocalMedia() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    mediaPromiseRef.current = null;
    setLocalStream(null);
  }

  function createPeerConnection(peerId: string, currentCallId: string) {
    const existing = pcMapRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("group_call:ice-candidate", {
          callId: currentCallId,
          to: peerId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      upsertParticipant(peerId, { stream: e.streams[0] });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        removeParticipant(peerId);
      }
    };

    pcMapRef.current.set(peerId, pc);
    return pc;
  }

  function goInCall() {
    const saved = readSession();
    const started =
      saved && saved.callId === callIdRef.current ? saved.startedAt : Date.now();
    setStartedAt(started);
    setStatus("in-call");
    persist({ startedAt: started });
  }

  /** Leaves the call for ME. Does not imply the call itself ended. */
  function cleanupAll() {
    stopRingtone();

    pcMapRef.current.forEach(closePeerConnection);
    pcMapRef.current.clear();
    pendingCandidatesRef.current.clear();

    stopLocalMedia();

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

    clearSession();
    onCallEndedRef.current?.();
  }

  /* ── actions ─────────────────────────────────────────────── */

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
    [currentUserId, currentUserName]
  );

  const joinCall = useCallback(
    async (
      callId: string,
      targetGroupId: string,
      type: GroupCallType,
      opts?: { minimized?: boolean }
    ) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUserId, currentUserName, setMinimized]
  );

  /**
   * Join a call already running in a group — this is the Join button.
   * Works whether you declined the ring, left earlier, or never got one.
   */
  const joinActiveCall = useCallback(
    (targetGroupId: string) => {
      if (callIdRef.current) return; // already busy in some call
      const active = activeCallsRef.current.get(targetGroupId);
      if (!active) return;
      joinCall(active.callId, targetGroupId, active.type);
    },
    [joinCall]
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    joinCall(incomingCall.callId, incomingCall.groupId, incomingCall.type);
  }, [incomingCall, joinCall]);

  const declineCall = useCallback(() => {
    if (incomingCall) {
      socket.emit("group_call:decline", {
        callId: incomingCall.callId,
        groupId: incomingCall.groupId,
        userId: currentUserId,
      });
    }
    setIncomingCall(null);
    setStatus("idle");
    callIdRef.current = null;
    groupIdRef.current = null;
    callTypeRef.current = null;
    // The call stays in activeGroupCalls, so the Join button appears.
  }, [incomingCall, currentUserId]);

  const leaveCall = useCallback(() => {
    if (callIdRef.current && groupIdRef.current) {
      socket.emit("group_call:leave", {
        callId: callIdRef.current,
        groupId: groupIdRef.current,
        userId: currentUserId,
      });
    }
    cleanupAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  /* ── sync on connect: resume + active call list ──────────── */

  useEffect(() => {
    if (!currentUserId) return;

    const sync = () => {
      socket.emit("group_call:active-check", { userId: currentUserId });

      const saved = readSession();
      if (!saved) return;
      if (Date.now() - saved.startedAt > MAX_RESUME_AGE_MS) {
        clearSession();
        return;
      }
      socket.emit("group_call:resume-check", {
        callId: saved.callId,
        groupId: saved.groupId,
        userId: currentUserId,
      });
    };

    if (socket.connected) sync();
    socket.on("connect", sync);
    return () => {
      socket.off("connect", sync);
    };
  }, [currentUserId]);

  /* ── signalling ──────────────────────────────────────────── */

  useEffect(() => {
    function isBusy() {
      return callIdRef.current !== null;
    }

    function trackActive(call: ActiveGroupCall) {
      setActiveGroupCalls((prev) => {
        const next = new Map(prev);
        next.set(call.groupId, call);
        return next;
      });
    }

    function untrackActive(gid: string) {
      setActiveGroupCalls((prev) => {
        if (!prev.has(gid)) return prev;
        const next = new Map(prev);
        next.delete(gid);
        return next;
      });
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

    function onResumeOk(data: {
      callId: string;
      groupId: string;
      type: GroupCallType;
    }) {
      const saved = readSession();
      joinCall(data.callId, data.groupId, data.type, {
        minimized: saved?.minimized ?? true,
      });
    }

    function onResumeDenied() {
      clearSession();
    }

    /** Broadcast to all group members when a call starts or membership changes. */
    function onActive(data: ActiveGroupCall) {
      trackActive(data);
    }

    function onActiveList(data: { calls: ActiveGroupCall[] }) {
      setActiveGroupCalls(new Map(data.calls.map((c) => [c.groupId, c])));
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

        const queued = pendingCandidatesRef.current.get(data.from) ?? [];
        for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c));
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
        const queued = pendingCandidatesRef.current.get(data.from) ?? [];
        for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c));
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
      if (data?.groupId) untrackActive(data.groupId);
      if (!data?.callId || data.callId === callIdRef.current) cleanupAll();
    }

    socket.on("group_call:initiated", onInitiated);
    socket.on("group_call:join-existing", onJoinExisting);
    socket.on("group_call:incoming", onIncoming);
    socket.on("group_call:resume-ok", onResumeOk);
    socket.on("group_call:resume-denied", onResumeDenied);
    socket.on("group_call:active", onActive);
    socket.on("group_call:active-list", onActiveList);
    socket.on("group_call:existing-participants", onExistingParticipants);
    socket.on("group_call:user-joined", onUserJoined);
    socket.on("group_call:user-left", onUserLeft);
    socket.on("group_call:offer", onOffer);
    socket.on("group_call:answer", onAnswer);
    socket.on("group_call:ice-candidate", onIceCandidate);
    socket.on("group_call:ended", onEnded);

    return () => {
      socket.off("group_call:initiated", onInitiated);
      socket.off("group_call:join-existing", onJoinExisting);
      socket.off("group_call:incoming", onIncoming);
      socket.off("group_call:resume-ok", onResumeOk);
      socket.off("group_call:resume-denied", onResumeDenied);
      socket.off("group_call:active", onActive);
      socket.off("group_call:active-list", onActiveList);
      socket.off("group_call:existing-participants", onExistingParticipants);
      socket.off("group_call:user-joined", onUserJoined);
      socket.off("group_call:user-left", onUserLeft);
      socket.off("group_call:offer", onOffer);
      socket.off("group_call:answer", onAnswer);
      socket.off("group_call:ice-candidate", onIceCandidate);
      socket.off("group_call:ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, joinCall, leaveCall]);

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