import { createHmac } from "crypto";
import type { Request, Response } from "express";

const DEFAULT_STUN = "stun:stun.l.google.com:19302";
const TURN_TTL_SECONDS = 3600;

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function getStunServers(): string[] {
  const configured = process.env.STUN_URLS
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return configured?.length ? configured : [DEFAULT_STUN];
}

function getTurnServers(userId: string | undefined): IceServer[] {
  const url = process.env.TURN_URL?.trim();
  if (!url) return [];

  const secret = process.env.TURN_SECRET?.trim();
  if (secret && userId) {
    const expiry = Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS;
    const username = `${expiry}:${userId}`;
    const credential = createHmac("sha1", secret).update(username).digest("base64");
    return [{ urls: url, username, credential }];
  }

  const username = process.env.TURN_USERNAME?.trim();
  const credential = process.env.TURN_CREDENTIAL;
  if (username && credential) {
    return [{ urls: url, username, credential }];
  }

  return [];
}

export function getRtcConfigController(req: Request, res: Response): void {
  const iceServers: IceServer[] = [
    ...getStunServers().map((urls) => ({ urls })),
    ...getTurnServers(req.user?.userId),
  ];

  res.status(200).json({ success: true, data: { iceServers } });
}
