import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "il_session";

// How long a session lasts without any activity. Every validated request in
// middleware slides this window forward, so "remember me" in practice means
// "logged in until N days of inactivity" rather than a fixed expiry date.
export const SESSION_DURATION_DAYS = Number(process.env.SESSION_DURATION_DAYS ?? 30);

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random 32+ character value in .env (e.g. `openssl rand -base64 32`)."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // userId
}

export async function signSessionToken(userId: string, days: number = SESSION_DURATION_DAYS): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function sessionCookieMaxAgeSeconds(days: number = SESSION_DURATION_DAYS): number {
  return days * 24 * 60 * 60;
}
