import { useEffect } from "react";
import type { RefObject } from "react";
import { socket } from "../socket/socket";
import type {
  CallStatus,
  CallType,
  DirectCallSignalEvent,
  DirectCallStateEvent,
  IncomingCall,
} from "../types/callTypes";
import type { DirectCallMedia } from "../utils/webrtc";
import { flushIceCandidates, getRtcConfiguration } from "../utils/webrtc";

export interface CallSignalingRefs {
  statusRef: RefObject<CallStatus>;
  isCallerRef: RefObject<boolean>;
  peerRef: RefObject<{ id: string; name: string } | null>;
  callTypeRef: RefObject<CallType | null>;
  callIdRef: RefObject<string | null>;
  pcRef: RefObject<RTCPeerConnection | null>;
  pendingCandidates: RefObject<RTCIceCandidateInit[]>;
}

export interface UseCallEventHandlersParams {
  currentUserId: string;
  refs: CallSignalingRefs;
  updateStatus: DirectCallMedia["updateStatus"];
  getLocalMedia: DirectCallMedia["getLocalMedia"];
  createPeerConnection: DirectCallMedia["createPeerConnection"];
  finishCall: DirectCallMedia["finishCall"];
  setIncomingCall: (call: IncomingCall | null) => void;
  setCallType: (type: CallType | null) => void;
  setPeer: (peer: { id: string; name: string } | null) => void;
}

export function useCallEventHandlers({
  currentUserId,
  refs,
  updateStatus,
  getLocalMedia,
  createPeerConnection,
  finishCall,
  setIncomingCall,
  setCallType,
  setPeer,
}: UseCallEventHandlersParams): void {
  const { statusRef, isCallerRef, peerRef, callTypeRef, callIdRef, pcRef, pendingCandidates } = refs;

  useEffect(() => {
    const isCurrentCall = (callId?: string): boolean =>
      Boolean(callId) && callId === callIdRef.current;

    const isFromPeer = (from?: string): boolean =>
      Boolean(from) && from === peerRef.current?.id;

    function onIncoming(data: IncomingCall) {
      if (statusRef.current !== "idle" || callIdRef.current) return;
      if (!data?.callId || !data.from || !data.type) return;

      callIdRef.current = data.callId;
      peerRef.current = { id: data.from, name: data.fromName };
      callTypeRef.current = data.type;
      setCallType(data.type);
      setPeer({ id: data.from, name: data.fromName });
      setIncomingCall(data);
      updateStatus("ringing");
    }

    async function onAccepted(data: DirectCallSignalEvent) {
      if (!isCallerRef.current || !isCurrentCall(data.callId) || !isFromPeer(data.from)) return;
      if (pcRef.current) return;
      const callType = data.callType ?? callTypeRef.current;
      if (!callType) return;
      callTypeRef.current = callType;
      setCallType(callType);

      try {
        updateStatus("connecting");
        await getRtcConfiguration(true);
        const stream = await getLocalMedia(callType);
        if (!isCurrentCall(data.callId) || pcRef.current) return;

        const pc = createPeerConnection(data.from, data.callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!isCurrentCall(data.callId)) return;

        socket.emit("call:offer", {
          callId: data.callId,
          to: data.from,
          from: currentUserId,
          callType,
          offer: { type: offer.type, sdp: offer.sdp },
        });
      } catch (err) {
        console.error("Failed to start offer:", err);
        socket.emit("call:end", {
          callId: data.callId,
          to: data.from,
          from: currentUserId,
          reason: "media",
        });
        finishCall("ended");
      }
    }

    async function onOffer(data: DirectCallSignalEvent) {
      if (isCallerRef.current || !isCurrentCall(data.callId) || !isFromPeer(data.from)) return;
      if (!data.offer) return;
      if (data.callType && !callTypeRef.current) {
        callTypeRef.current = data.callType;
        setCallType(data.callType);
      }

      const pc = pcRef.current;
      if (!pc || pc.signalingState !== "stable") return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const queued = pendingCandidates.current.slice();
        pendingCandidates.current = [];
        await flushIceCandidates(pc, queued);
        if (!isCurrentCall(data.callId)) return;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", {
          callId: data.callId,
          to: data.from,
          from: currentUserId,
          callType: callTypeRef.current,
          answer: { type: answer.type, sdp: answer.sdp },
        });
      } catch (err) {
        console.error("Failed to answer offer:", err);
        socket.emit("call:end", {
          callId: data.callId,
          to: data.from,
          from: currentUserId,
          reason: "media",
        });
        finishCall("ended");
      }
    }

    async function onAnswer(data: DirectCallSignalEvent) {
      if (!isCallerRef.current || !isCurrentCall(data.callId) || !isFromPeer(data.from)) return;
      if (!data.answer) return;

      const pc = pcRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        const queued = pendingCandidates.current.slice();
        pendingCandidates.current = [];
        await flushIceCandidates(pc, queued);
      } catch (err) {
        console.error("Failed to apply answer:", err);
      }
    }

    async function onIceCandidate(data: DirectCallSignalEvent) {
      if (!isCurrentCall(data.callId) || !isFromPeer(data.from) || !data.candidate) return;

      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn("Failed to add ICE candidate:", err);
        }
        return;
      }

      if (pendingCandidates.current.length < 100) {
        pendingCandidates.current.push(data.candidate);
      }
    }

    const terminalHandler =
      (status: "rejected" | "missed" | "ended") =>
      (data?: { callId?: string }) => {
        if (isCurrentCall(data?.callId)) finishCall(status);
      };

    const onRejected = terminalHandler("rejected");
    const onCancelled = terminalHandler("missed");
    const onEnded = terminalHandler("ended");
    const onTimeout = terminalHandler("missed");

    function onUnavailable(data?: { callId?: string; reason?: string; callType?: CallType }) {
      if (!isCurrentCall(data?.callId)) return;
      if (statusRef.current !== "calling" && statusRef.current !== "ringing") return;
      if (data?.callType && !callTypeRef.current) {
        callTypeRef.current = data.callType;
        setCallType(data.callType);
      }
      finishCall("missed");
    }

    function onState(data: DirectCallStateEvent) {
      if (!data?.callId || !isCurrentCall(data.callId)) return;
      if (data.originSocketId === socket.id) return;
      if (data.callType && !callTypeRef.current) {
        callTypeRef.current = data.callType;
        setCallType(data.callType);
      }

      switch (data.status) {
        case "connecting":
          if (data.reason === "stale-socket") break;
          if (statusRef.current === "calling" || statusRef.current === "ringing") {
            updateStatus("connecting");
          }
          break;
        case "connected":
          if (statusRef.current === "connecting") updateStatus("connected");
          break;
        case "rejected":
          finishCall("rejected");
          break;
        case "ended":
          finishCall("ended");
          break;
        case "missed":
          finishCall("missed");
          break;
        default:
          break;
      }
    }

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:state", onState);
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
      socket.off("call:state", onState);
      socket.off("call:rejected", onRejected);
      socket.off("call:cancelled", onCancelled);
      socket.off("call:ended", onEnded);
      socket.off("call:unavailable", onUnavailable);
      socket.off("call:timeout", onTimeout);
    };
  }, [
    callIdRef,
    callTypeRef,
    createPeerConnection,
    currentUserId,
    finishCall,
    getLocalMedia,
    isCallerRef,
    pcRef,
    peerRef,
    pendingCandidates,
    setCallType,
    setIncomingCall,
    setPeer,
    statusRef,
    updateStatus,
  ]);
}
