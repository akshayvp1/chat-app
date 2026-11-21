export type CallType = "audio" | "video";
export type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "rejected"
  | "ended"
  | "missed";

export type DirectCallTerminalStatus = Extract<
  CallStatus,
  "rejected" | "ended" | "missed"
>;
export type GroupCallType = CallType;
export type GroupCallUIStatus = "idle" | "incoming" | "connecting" | "in-call";

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  type: CallType;
}

export interface DirectCallStateEvent {
  callId: string;
  status: CallStatus;
  from: string;
  reason?: string;
  originSocketId?: string;
  at: number;
}

export interface DirectCallSignalEvent {
  callId: string;
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface IncomingGroupCall {
  callId: string;
  groupId: string;
  fromName: string;
  type: GroupCallType;
}

export interface ParticipantState {
  userId: string;
  name: string;
  stream: MediaStream | null;
}

export interface ActiveGroupCall {
  callId: string;
  groupId: string;
  type: GroupCallType;
  participantCount: number;
  startedAt: number;
}

export interface CallModalProps {
  status: CallStatus;
  callType: CallType | null;
  peerName?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export interface GroupCallModalProps {
  status: GroupCallUIStatus;
  callType: GroupCallType | null;
  groupName?: string;
  incomingFromName?: string;
  localStream: MediaStream | null;
  participants: ParticipantState[];
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onMinimize: () => void;
}
