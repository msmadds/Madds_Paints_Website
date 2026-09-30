/**
 * Admin session tokens (signed JWT in an httpOnly cookie).
 * Kept free of database / Node-only imports so `src/proxy.ts` can use it.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mp_admin";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function key(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

export type AdminSession = { email: string };

export async function signSession(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setSubject("admin")
    .setAudience("medepaints-admin")
    .sign(key());
}

export async function verifySessionToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "medepaints-admin" });
    if (payload.sub !== "admin" || typeof payload.email !== "string") return null;
    // Invalidate sessions if the configured admin email changes.
    const expected = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (!expected || payload.email !== expected) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}
