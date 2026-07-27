import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const SESSION_COOKIE = {
  name: "px_session",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SITE_PASSWORD;
  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET (or SITE_PASSWORD) environment variable."
    );
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Issues a signed, timestamped session token. No per-user identity — the whole team shares one session shape. */
export function createSessionToken(): string {
  const payload = `authenticated.${Date.now()}`;
  return `${payload}.${sign(payload, getSecret())}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [label, timestampRaw, signature] = parts;
  if (label !== "authenticated") return false;

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) return false;

  const ageMs = Date.now() - timestamp;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) return false;

  const expected = sign(`${label}.${timestampRaw}`, getSecret());
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    throw new Error("Missing SITE_PASSWORD environment variable.");
  }
  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidate);
  if (expectedBuf.length !== candidateBuf.length) return false;
  return timingSafeEqual(expectedBuf, candidateBuf);
}
