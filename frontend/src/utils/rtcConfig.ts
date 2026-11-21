import { fetchRtcConfiguration } from "../services/user/rtcConfigService";

const FALLBACK_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const CONFIG_TTL_MS = 20 * 60 * 1000;

let currentConfiguration: RTCConfiguration = FALLBACK_CONFIGURATION;
let fetchedAt = 0;
let pendingConfiguration: Promise<RTCConfiguration> | null = null;

export function getCurrentRtcConfiguration(): RTCConfiguration {
  return currentConfiguration;
}

export function getRtcConfiguration(force = false): Promise<RTCConfiguration> {
  if (pendingConfiguration) return pendingConfiguration;
  if (!force && fetchedAt && Date.now() - fetchedAt < CONFIG_TTL_MS) {
    return Promise.resolve(currentConfiguration);
  }

  pendingConfiguration = fetchRtcConfiguration()
    .then((iceServers) => {
      if (iceServers.length > 0) {
        currentConfiguration = { iceServers };
      }
      fetchedAt = Date.now();
      return currentConfiguration;
    })
    .catch(() => {
      fetchedAt = Date.now();
      return currentConfiguration;
    })
    .finally(() => {
      pendingConfiguration = null;
    });

  return pendingConfiguration;
}

export function preloadRtcConfiguration(): void {
  void getRtcConfiguration();
}
