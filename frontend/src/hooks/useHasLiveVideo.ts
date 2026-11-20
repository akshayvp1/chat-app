import { useEffect, useState } from "react";

/** True while the stream actually carries a playable video track. */
export function streamHasLiveVideo(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream
    .getVideoTracks()
    .some((track) => track.readyState === "live" && track.enabled && !track.muted);
}

/**
 * A remote peer's video can stop arriving at any time (they turned the
 * camera off, or it's an audio call). We keep the <video> element mounted
 * either way so audio keeps playing, and overlay an avatar when there is
 * nothing to show. Detaching the element would silence the peer.
 */
export function useHasLiveVideo(stream: MediaStream | null) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!stream) return;

    const evaluate = () => forceUpdate((tick) => tick + 1);

    stream.addEventListener("addtrack", evaluate);
    stream.addEventListener("removetrack", evaluate);

    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => {
      track.addEventListener("mute", evaluate);
      track.addEventListener("unmute", evaluate);
      track.addEventListener("ended", evaluate);
    });

    return () => {
      stream.removeEventListener("addtrack", evaluate);
      stream.removeEventListener("removetrack", evaluate);
      tracks.forEach((track) => {
        track.removeEventListener("mute", evaluate);
        track.removeEventListener("unmute", evaluate);
        track.removeEventListener("ended", evaluate);
      });
    };
  }, [stream]);

  return streamHasLiveVideo(stream);
}
