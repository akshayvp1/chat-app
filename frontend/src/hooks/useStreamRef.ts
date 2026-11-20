import { useCallback } from "react";

/**
 * Attach a MediaStream to a media element via a CALLBACK REF.
 *
 * useRef + useEffect([stream]) is subtly broken here: if the stream is
 * assigned while the element is not yet mounted (which is what happened
 * to the caller, because status flipped to "connected" after
 * getUserMedia resolved), the effect runs against a null ref and nothing
 * ever re-runs it once the element appears.
 *
 * A callback ref fires on mount AND whenever the callback identity
 * changes, so both orderings are covered.
 */
export function useStreamRef<T extends HTMLMediaElement>(stream: MediaStream | null) {
  return useCallback(
    (el: T | null) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream;
      el.play().catch(() => undefined); // autoplay policy can reject; harmless
    },
    [stream]
  );
}
