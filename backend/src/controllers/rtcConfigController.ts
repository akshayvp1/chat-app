import type { Request, Response } from "express";

const DEFAULT_STUN = "stun:stun.l.google.com:19302";
const METERED_STUN = "stun:stun.relay.metered.ca:80";
const METERED_TURN_HOST = "global.relay.metered.ca";
const METERED_TURN_URLS = [
  `turn:${METERED_TURN_HOST}:80`,
  `turn:${METERED_TURN_HOST}:80?transport=tcp`,
  `turn:${METERED_TURN_HOST}:443`,
  `turn:${METERED_TURN_HOST}:443?transport=tcp`,
  `turns:${METERED_TURN_HOST}:443?transport=tcp`,
];
const METERED_REQUEST_TIMEOUT_MS = 8000;
const METERED_CONFIG_TTL_MS = 20 * 60 * 1000;

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: "password" | "oauth";
}

type TurnCredentials = Pick<IceServer, "username" | "credential" | "credentialType">;

let cachedMeteredIceServers: IceServer[] | null = null;
let cachedMeteredAt = 0;
let pendingMeteredConfig: Promise<IceServer[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getUrls(server: IceServer): string[] {
  return typeof server.urls === "string" ? [server.urls] : server.urls;
}

function hasScheme(server: IceServer, scheme: string): boolean {
  return getUrls(server).some((url) => url.toLowerCase().startsWith(scheme));
}

function normalizeUrls(value: unknown): string | string[] | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((url) => typeof url === "string")) {
    return value as string[];
  }
  return null;
}

function normalizeIceServer(value: unknown): IceServer | null {
  if (!isRecord(value)) return null;
  const urls = normalizeUrls(value.urls);
  if (!urls) return null;

  const server: IceServer = { urls };
  if (typeof value.username === "string") server.username = value.username;
  if (typeof value.credential === "string") server.credential = value.credential;
  if (value.credentialType === "password" || value.credentialType === "oauth") {
    server.credentialType = value.credentialType;
  }
  return server;
}

function extractIceServers(payload: unknown): IceServer[] {
  const source = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const list = Array.isArray(source)
    ? source
    : isRecord(source) && Array.isArray(source.iceServers)
      ? source.iceServers
      : [];
  return list
    .map(normalizeIceServer)
    .filter((server): server is IceServer => server !== null);
}

function getTurnCredentials(servers: IceServer[]): TurnCredentials | null {
  for (const server of servers) {
    if (!hasScheme(server, "turn:") && !hasScheme(server, "turns:")) continue;
    if (!server.username || !server.credential) continue;
    const credentials: TurnCredentials = {
      username: server.username,
      credential: server.credential,
    };
    if (server.credentialType) credentials.credentialType = server.credentialType;
    return credentials;
  }
  return null;
}

function withRequiredIceServers(servers: IceServer[]): IceServer[] {
  const credentials = getTurnCredentials(servers);
  if (!credentials) return servers;

  const existing = new Set(servers.flatMap(getUrls));
  const additions: IceServer[] = [];

  if (!servers.some((server) => hasScheme(server, "stun:"))) {
    additions.push({ urls: METERED_STUN });
  }

  for (const url of METERED_TURN_URLS) {
    if (existing.has(url)) continue;
    additions.push({ urls: url, ...credentials });
  }

  return [...servers, ...additions];
}

function normalizeMeteredAppName(value: string): string | null {
  const app = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/\.metered\.live$/i, "");
  return /^[a-z0-9-]+$/i.test(app) ? app : null;
}

function buildMeteredConfigUrl(): string | null {
  const rawAppName = process.env.METERED_APP_NAME?.trim();
  const apiKey = process.env.TURN_API_KEY?.trim();
  if (!rawAppName || !apiKey) return null;

  const appName = normalizeMeteredAppName(rawAppName);
  if (!appName) return null;

  const region = process.env.TURN_REGION?.trim() || "global";
  const query = new URLSearchParams({ apiKey, region });
  return `https://${appName}.metered.live/api/v1/turn/credentials?${query.toString()}`;
}

async function fetchMeteredIceServers(): Promise<IceServer[]> {
  const url = buildMeteredConfigUrl();
  if (!url) throw new Error("Metered TURN is not configured");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(METERED_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Metered TURN request failed: ${response.status}`);

  const iceServers = withRequiredIceServers(extractIceServers(await response.json()));
  if (!iceServers.some((server) => hasScheme(server, "turn:") || hasScheme(server, "turns:"))) {
    throw new Error("Metered TURN returned no usable TURN servers");
  }
  return iceServers;
}

function getCachedMeteredIceServers(): Promise<IceServer[]> {
  if (pendingMeteredConfig) return pendingMeteredConfig;
  if (cachedMeteredIceServers && Date.now() - cachedMeteredAt < METERED_CONFIG_TTL_MS) {
    return Promise.resolve(cachedMeteredIceServers);
  }

  pendingMeteredConfig = fetchMeteredIceServers()
    .then((iceServers) => {
      cachedMeteredIceServers = iceServers;
      cachedMeteredAt = Date.now();
      return iceServers;
    })
    .finally(() => {
      pendingMeteredConfig = null;
    });

  return pendingMeteredConfig;
}

function hasMeteredConfiguration(): boolean {
  return Boolean(process.env.METERED_APP_NAME?.trim() && process.env.TURN_API_KEY?.trim());
}

function getStunServers(): IceServer[] {
  const configured = process.env.STUN_URLS
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return (configured?.length ? configured : [DEFAULT_STUN]).map((urls) => ({ urls }));
}

export async function getRtcConfigController(_req: Request, res: Response): Promise<void> {
  if (!hasMeteredConfiguration()) {
    res.status(200).json({ success: true, data: { iceServers: getStunServers() } });
    return;
  }

  try {
    const iceServers = await getCachedMeteredIceServers();
    res.status(200).json({ success: true, data: { iceServers } });
  } catch {
    console.error("Metered TURN configuration unavailable");
    res.status(502).json({ success: false, error: "TURN configuration unavailable" });
  }
}
