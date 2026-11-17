// import jwt from "jsonwebtoken";

// export const generateAccessToken = (userId: string): string => {
//   return jwt.sign(
//     { userId },
//     process.env.JWT_ACCESS_SECRET as string,
//     {
//       expiresIn: "15m",
//     }
//   );
// };

// export const generateRefreshToken = (userId: string): string => {
//   return jwt.sign(
//     { userId },
//     process.env.JWT_REFRESH_SECRET as string,
//     {
//       expiresIn: "7d",
//     }
//   );
// };



import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Generate access token
 *
 * Contains:
 * - userId
 * - email
 * - name
 *
 * Expires in 15 minutes.
 */
export const generateAccessToken = (
  userId: string,
  email: string,
  name: string
): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  const payload: AccessTokenPayload = {
    userId,
    email,
    name,
  };

  return jwt.sign(payload, secret, {
    expiresIn: "15m",
  });
};

/**
 * Generate refresh token
 *
 * Contains only:
 * - userId
 *
 * Expires in 7 days.
 */
export const generateRefreshToken = (
  userId: string
): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  const payload: RefreshTokenPayload = {
    userId,
  };

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  });
};