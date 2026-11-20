import type { GroupCallType } from "../types/callTypes";

const SESSION_KEY = "active_group_call";
const MAX_RESUME_AGE_MS = 6 * 60 * 60 * 1000;

export interface PersistedGroupCall {
  callId: string;
  groupId: string;
  type: GroupCallType;
  startedAt: number;
  minimized: boolean;
}

export interface GroupCallIdentity {
  callId: string;
  groupId: string;
  type: GroupCallType;
}

function readRawSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeRawSession(raw: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, raw);
  } catch {
    return;
  }
}

function removeRawSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

function parseSession(raw: string): PersistedGroupCall | null {
  try {
    return JSON.parse(raw) as PersistedGroupCall;
  } catch {
    return null;
  }
}

export function readGroupCallSession(): PersistedGroupCall | null {
  const raw = readRawSession();
  return raw ? parseSession(raw) : null;
}

export function writeGroupCallSession(value: PersistedGroupCall): void {
  writeRawSession(JSON.stringify(value));
}

export function clearGroupCallSession(): void {
  removeRawSession();
}

function isExpired(saved: PersistedGroupCall): boolean {
  return Date.now() - saved.startedAt > MAX_RESUME_AGE_MS;
}

export function clearExpiredGroupCallSession(
  saved: PersistedGroupCall
): boolean {
  if (!isExpired(saved)) return false;
  clearGroupCallSession();
  return true;
}

export function persistGroupCallSession(
  identity: GroupCallIdentity,
  patch: Partial<PersistedGroupCall> = {}
): void {
  const previous = readGroupCallSession();
  const same = previous?.callId === identity.callId;
  writeGroupCallSession({
    callId: identity.callId,
    groupId: identity.groupId,
    type: identity.type,
    startedAt: same ? previous!.startedAt : Date.now(),
    minimized: same ? previous!.minimized : false,
    ...patch,
  });
}

function isSavedForCall(
  saved: PersistedGroupCall | null,
  callId: string | null
): boolean {
  return saved !== null && saved.callId === callId;
}

export function groupCallStartedAt(
  saved: PersistedGroupCall | null,
  callId: string | null
): number {
  return isSavedForCall(saved, callId) ? saved!.startedAt : Date.now();
}
