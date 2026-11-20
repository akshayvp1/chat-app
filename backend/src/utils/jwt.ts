import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

const DEFAULT_ACCESS_TTL = "15m";
const DEFAULT_REFRESH_TTL = "7d";

/**
 * Token lifetimes. Read from the environment on every call so that
 * `dotenv.config()` running after this module is imported cannot leave us
 * with `undefined` TTLs. `ACCESS_TOKEN_EXPIRES` / `REFRESH_TOKEN_EXPIRES`
 * accept jsonwebtoken style values ("15m", "7d") or a plain number of seconds.
 */
export const getAccessTtl = (): string =>
  process.env.ACCESS_TOKEN_EXPIRES || DEFAULT_ACCESS_TTL;

export const getRefreshTtl = (): string =>
  process.env.REFRESH_TOKEN_EXPIRES || DEFAULT_REFRESH_TTL;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converts a jwt TTL string into milliseconds so cookie `maxAge` can never
 * drift from the token it is carrying. Falls back to the default lifetime
 * if the configured value is unparseable.
 */
export const ttlToMs = (ttl: string, fallbackMs: number): number => {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  return amount * UNIT_MS[unit];
};

export const getAccessTokenMaxAgeMs = (): number =>
  ttlToMs(getAccessTtl(), 15 * 60 * 1000);

export const getRefreshTokenMaxAgeMs = (): number =>
  ttlToMs(getRefreshTtl(), 7 * 24 * 60 * 60 * 1000);

const requireSecret = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

/**
 * Generate access token containing userId, email and name.
 */
export const generateAccessToken = (
  userId: string,
  email: string,
  name: string
): string => {
  const payload: AccessTokenPayload = { userId, email, name };

  return jwt.sign(payload, requireSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET), {
    expiresIn: getAccessTtl() as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Generate refresh token containing only userId.
 */
export const generateRefreshToken = (userId: string): string => {
  const payload: RefreshTokenPayload = { userId };

  return jwt.sign(payload, requireSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET), {
    expiresIn: getRefreshTtl() as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, requireSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET)) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, requireSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET)) as RefreshTokenPayload;
