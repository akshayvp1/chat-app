import { fetchRtcConfiguration } from "../services/user/rtcConfigService";

const FALLBACK_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.relay.metered.ca:80" }],
};
const CONFIG_TTL_MS = 20 * 60 * 1000;

let currentConfiguration: RTCConfiguration = FALLBACK_CONFIGURATION;
let fetchedAt = 0;
let pendingConfiguration: Promise<RTCConfiguration> | null = null;

export function getCurrentRtcConfiguration(): RTCConfiguration {
  return currentConfiguration;
}

export function hasTurnServer(config: RTCConfiguration = currentConfiguration): boolean {
  return (config.iceServers ?? []).some((server) => {
    const urls = typeof server.urls === "string" ? [server.urls] : server.urls;
    return urls.some((url) => url.startsWith("turn:") || url.startsWith("turns:"));
  });
}

export function getRtcDiagnostics(): {
  hasTurn: boolean;
  iceServers: Array<{ urls: string | string[]; hasCredentials: boolean }>;
} {
  return {
    hasTurn: hasTurnServer(),
    iceServers: (currentConfiguration.iceServers ?? []).map((server) => ({
      urls: server.urls,
      hasCredentials: Boolean(server.username && server.credential),
    })),
  };
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
    .catch((error) => {
      console.warn("RTC configuration fetch failed; using cached configuration", error);
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
