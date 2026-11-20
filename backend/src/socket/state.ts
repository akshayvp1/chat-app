export const RING_TIMEOUT_MS = 45_000;

export type DirectCallStatus = "completed" | "missed" | "rejected";
export type GroupCallStatus = "completed" | "missed";

type Timer = ReturnType<typeof setTimeout>;

const ringingTimers = new Map<string, Timer>();
const groupRingingTimers = new Map<string, Timer>();
const finalizingGroupCalls = new Set<string>();

export function setRingingTimer(callId: string, timer: Timer): void {
  ringingTimers.set(callId, timer);
}

export function removeRingingTimer(callId: string): void {
  ringingTimers.delete(callId);
}

export function clearRingingTimer(callId: string): void {
  const timer = ringingTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    ringingTimers.delete(callId);
  }
}

export function setGroupRingingTimer(callId: string, timer: Timer): void {
  groupRingingTimers.set(callId, timer);
}

export function removeGroupRingingTimer(callId: string): void {
  groupRingingTimers.delete(callId);
}

export function clearGroupRingingTimer(callId: string): void {
  const timer = groupRingingTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    groupRingingTimers.delete(callId);
  }
}

export function tryBeginGroupCallFinalization(callId: string): boolean {
  if (finalizingGroupCalls.has(callId)) {
    return false;
  }
  finalizingGroupCalls.add(callId);
  return true;
}

export function finishGroupCallFinalization(callId: string): void {
  finalizingGroupCalls.delete(callId);
}
