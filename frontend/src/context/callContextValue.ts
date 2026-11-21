import { createContext, useContext } from "react";

import type { useCall } from "../hooks/useCall";
import type { useGroupCall } from "../hooks/useGroupCall";

type DirectCallResult = ReturnType<typeof useCall>;
type GroupCallResult = ReturnType<typeof useGroupCall>;

export interface CallContextValue {
  call: DirectCallResult;
  groupCall: GroupCallResult;
}

export const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used inside CallProvider");
  }
  return context;
}
