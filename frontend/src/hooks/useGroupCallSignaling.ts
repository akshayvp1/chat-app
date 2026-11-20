import { useEffect } from "react";
import { socket } from "../socket/socket";
import { createGroupCallSignalHandlers } from "./useGroupCallSignalHandlers";
import type { UseGroupCallSignalingParams } from "./useGroupCallSignalHandlers";

export { createGroupCallSignalHandlers };
export type { UseGroupCallSignalingParams };

export function useGroupCallSignaling({
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
}: UseGroupCallSignalingParams): void {
  useEffect(() => {
    const handlers = createGroupCallSignalHandlers({
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

    socket.on("group_call:initiated", handlers.onInitiated);
    socket.on("group_call:join-existing", handlers.onJoinExisting);
    socket.on("group_call:incoming", handlers.onIncoming);
    socket.on("group_call:existing-participants", handlers.onExistingParticipants);
    socket.on("group_call:user-joined", handlers.onUserJoined);
    socket.on("group_call:user-left", handlers.onUserLeft);
    socket.on("group_call:offer", handlers.onOffer);
    socket.on("group_call:answer", handlers.onAnswer);
    socket.on("group_call:ice-candidate", handlers.onIceCandidate);
    socket.on("group_call:ended", handlers.onEnded);
    socket.on("call:unavailable", handlers.onUnavailable);

    return () => {
      socket.off("group_call:initiated", handlers.onInitiated);
      socket.off("group_call:join-existing", handlers.onJoinExisting);
      socket.off("group_call:incoming", handlers.onIncoming);
      socket.off("group_call:existing-participants", handlers.onExistingParticipants);
      socket.off("group_call:user-joined", handlers.onUserJoined);
      socket.off("group_call:user-left", handlers.onUserLeft);
      socket.off("group_call:offer", handlers.onOffer);
      socket.off("group_call:answer", handlers.onAnswer);
      socket.off("group_call:ice-candidate", handlers.onIceCandidate);
      socket.off("group_call:ended", handlers.onEnded);
      socket.off("call:unavailable", handlers.onUnavailable);
    };
  }, [
    currentUserId,
    joinCall,
    leaveCall,
    getLocalMedia,
    goInCall,
    createPeerConnection,
    setStatus,
    upsertParticipant,
    removeParticipant,
    cleanupAll,
    untrackActiveGroupCall,
    callIdRef,
    callTypeRef,
    groupIdRef,
    pcMapRef,
    pendingCandidatesRef,
    setCallType,
    setGroupId,
    setIncomingCall,
  ]);
}
