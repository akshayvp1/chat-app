import { useEffect } from "react";
import type { RefObject } from "react";
import { socket } from "../socket/socket";
import type { CallStatus, CallType, IncomingCall } from "../types/callTypes";
import type { DirectCallMedia } from "../utils/webrtc";
import { flushIceCandidates } from "../utils/webrtc";

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
  cleanupCall: DirectCallMedia["cleanupCall"];
  endCall: () => void;
  setIncomingCall: (call: IncomingCall | null) => void;
}

export function useCallEventHandlers({
  currentUserId,
  refs,
  updateStatus,
  getLocalMedia,
  createPeerConnection,
  cleanupCall,
  endCall,
  setIncomingCall,
}: UseCallEventHandlersParams): void {
  const {
    statusRef,
    peerRef,
    callTypeRef,
    callIdRef,
    pcRef,
    pendingCandidates,
  } = refs;

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
      updateStatus("ringing");
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
        updateStatus("connected");

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

        await flushIceCandidates(pc, pendingCandidates.current);
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
        await flushIceCandidates(pc, pendingCandidates.current);
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

    function onRejected() { cleanupCall(); }
    function onCancelled() { cleanupCall(); }
    function onEnded() { cleanupCall(); }
    function onUnavailable(data?: { callId?: string }) {
      if (!data?.callId || data.callId === callIdRef.current) cleanupCall();
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
  }, [
    currentUserId,
    endCall,
    getLocalMedia,
    createPeerConnection,
    cleanupCall,
    updateStatus,
    callIdRef,
    callTypeRef,
    pcRef,
    peerRef,
    pendingCandidates,
    setIncomingCall,
    statusRef,
  ]);
}
