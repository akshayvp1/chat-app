import { fetchRtcConfiguration } from "../services/user/rtcConfigService";

const FALLBACK_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let currentConfiguration: RTCConfiguration = FALLBACK_CONFIGURATION;
let pendingConfiguration: Promise<RTCConfiguration> | null = null;

export function getCurrentRtcConfiguration(): RTCConfiguration {
  return currentConfiguration;
}

export function getRtcConfiguration(): Promise<RTCConfiguration> {
  if (!pendingConfiguration) {
    pendingConfiguration = fetchRtcConfiguration()
      .then((iceServers) => {
        if (iceServers.length > 0) {
          currentConfiguration = { iceServers };
        }
        return currentConfiguration;
      })
      .catch(() => currentConfiguration);
  }

  return pendingConfiguration;
}

export function preloadRtcConfiguration(): void {
  void getRtcConfiguration();
}
