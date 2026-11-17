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
    // TURN goes here. Without it, a real share of calls connect and
    // then show black video.
  ],
};

export type CallType = "audio" | "video";
export type CallStatus = "idle" | "calling" | "ringing" | "connected";

interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  type: CallType;
}

interface UseCallParams {
  currentUserId: string;
  currentUserName: string;
  onCallEnded?: () => void;
}

export function useCall({
  currentUserId,
  currentUserName,
  onCallEnded,
}: UseCallParams) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const peerRef = useRef<{ id: string; name: string } | null>(null);
  const callTypeRef = useRef<CallType | null>(null);
  const isCallerRef = useRef(false);
  const statusRef = useRef<CallStatus>("idle");
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status === "ringing") startIncomingRingtone();
    else if (status === "calling") startOutgoingRingback();
    else stopRingtone();
  }, [status]);

  useEffect(() => () => stopRingtone(), []);

  /* ── local media (single-flight) ─────────────────────────── */

  function getLocalMedia(type: CallType): Promise<MediaStream> {
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

  function createPeerConnection(to: string, currentCallId: string) {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("call:ice-candidate", {
          callId: currentCallId,
          to,
          candidate: e.candidate,
        });
      }
    };

    /**
     * Accumulate tracks into one stable MediaStream.
     *
     * The old `setRemoteStream(e.streams[0])` looks right but breaks when
     * audio arrives before video: the second ontrack hands back the SAME
     * object reference, React bails out of the re-render, and the <video>
     * never gets re-attached. Building a fresh MediaStream from the
     * accumulated tracks guarantees a new reference each time.
     */
    pc.ontrack = (e) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      const rs = remoteStreamRef.current;
      if (!rs.getTracks().some((t) => t.id === e.track.id)) rs.addTrack(e.track);
      setRemoteStream(new MediaStream(rs.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }

  function cleanupCall() {
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    pcRef.current = null;

    // The ONLY place local hardware tracks are stopped.
    // Never stop them via pc.getSenders() — the same track objects are
    // shared, and stopping them is irreversible.
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    mediaPromiseRef.current = null;
    remoteStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setCallType(null);
    setPeer(null);
    setIsMuted(false);
    setIsCameraOff(false);

    callIdRef.current = null;
    peerRef.current = null;
    callTypeRef.current = null;
    isCallerRef.current = false;
    pendingCandidates.current = [];

    onCallEndedRef.current?.();
  }

  /* ── caller ──────────────────────────────────────────────── */

  const startCall = useCallback(
    (to: string, toName: string, type: CallType) => {
      const newCallId = `${currentUserId}_${to}_${Date.now()}`;

      isCallerRef.current = true;
      callIdRef.current = newCallId;
      callTypeRef.current = type;
      peerRef.current = { id: to, name: toName };

      setCallType(type);
      setPeer({ id: to, name: toName });
      setStatus("calling");

      socket.emit("call:initiate", {
        callId: newCallId,
        to,
        from: currentUserId,
        fromName: currentUserName,
        type,
      });
    },
    [currentUserId, currentUserName]
  );

  /* ── receiver ────────────────────────────────────────────── */

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { callId, from, fromName, type } = incomingCall;

    isCallerRef.current = false;
    callIdRef.current = callId;
    callTypeRef.current = type;
    peerRef.current = { id: from, name: fromName };

    setCallType(type);
    setPeer({ id: from, name: fromName });
    setIncomingCall(null);
    setStatus("connected");

    try {
      const stream = await getLocalMedia(type);
      const pc = createPeerConnection(from, callId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      socket.emit("call:accept", { callId, to: from, from: currentUserId });
    } catch (err) {
      console.error("Failed to get local media:", err);
      socket.emit("call:reject", { callId, to: from, from: currentUserId });
      cleanupCall();
    }
  }, [incomingCall, currentUserId]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit("call:reject", {
      callId: incomingCall.callId,
      to: incomingCall.from,
      from: currentUserId,
    });
    setIncomingCall(null);
    setStatus("idle");
    callIdRef.current = null;
    peerRef.current = null;
    callTypeRef.current = null;
  }, [incomingCall, currentUserId]);

  const endCall = useCallback(() => {
    if (callIdRef.current && peerRef.current) {
      const event =
        isCallerRef.current && statusRef.current === "calling"
          ? "call:cancel"
          : "call:end";
      socket.emit(event, {
        callId: callIdRef.current,
        to: peerRef.current.id,
        from: currentUserId,
      });
    }
    cleanupCall();
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

  /* ── signalling ──────────────────────────────────────────── */

  useEffect(() => {
    function onIncoming(data: IncomingCall) {
      if (statusRef.current !== "idle") {
        socket.emit("call:reject", {
          callId: data.callId,
          to: data.from,
          from: currentUserId,
          reason: "busy",
        });
        return;
      }
      setIncomingCall(data);
      setStatus("ringing");
    }

    async function onAccepted(data: { callId: string; from: string }) {
      if (!peerRef.current || !callTypeRef.current) return;
      try {
        /**
         * Flip to "connected" FIRST so CallModal mounts its <video>
         * elements before any stream exists. This is the blank-video fix
         * on the caller side; the accepter already did it in this order,
         * which is why only the caller was affected.
         */
        setStatus("connected");

        const stream = await getLocalMedia(callTypeRef.current);
        const pc = createPeerConnection(data.from, data.callId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", { callId: data.callId, to: data.from, offer });
      } catch (err) {
        console.error("Failed to start offer:", err);
        endCall();
      }
    }

    async function onOffer(data: { offer: RTCSessionDescriptionInit }) {
      const pc = pcRef.current;
      if (!pc || !peerRef.current) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidates.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          callId: callIdRef.current,
          to: peerRef.current.id,
          answer,
        });
      } catch (err) {
        console.error("Failed to answer offer:", err);
      }
    }

    async function onAnswer(data: { answer: RTCSessionDescriptionInit }) {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error("Failed to apply answer:", err);
      }
    }

    async function onIceCandidate(data: { candidate: RTCIceCandidateInit }) {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      } else {
        pendingCandidates.current.push(data.candidate);
      }
    }

    function onRejected() {
      cleanupCall();
    }
    function onCancelled() {
      setIncomingCall(null);
      cleanupCall();
    }
    function onEnded() {
      cleanupCall();
    }
    function onUnavailable() {
      cleanupCall();
    }
    function onTimeout() {
      cleanupCall();
    }

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:rejected", onRejected);
    socket.on("call:cancelled", onCancelled);
    socket.on("call:ended", onEnded);
    socket.on("call:unavailable", onUnavailable);
    socket.on("call:timeout", onTimeout);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:rejected", onRejected);
      socket.off("call:cancelled", onCancelled);
      socket.off("call:ended", onEnded);
      socket.off("call:unavailable", onUnavailable);
      socket.off("call:timeout", onTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, endCall]);

  return {
    status,
    callType,
    peer,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}