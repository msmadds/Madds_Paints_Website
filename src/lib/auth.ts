import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySessionToken, type AdminSession } from "./session";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

function configuredHash(): string | null {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!raw) return null;
  if (raw.startsWith("$2")) return raw; // plain bcrypt hash
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded.startsWith("$2") ? decoded : null;
  } catch {
    return null;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Returns true if `key` has too many recent failed attempts. */
export async function isRateLimited(key: string, max = MAX_FAILURES, minutes = WINDOW_MINUTES) {
  const since = new Date(Date.now() - minutes * 60_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.key, key),
        eq(schema.loginAttempts.success, false),
        gte(schema.loginAttempts.createdAt, since),
      ),
    );
  return (row?.n ?? 0) >= max;
}

export async function recordAttempt(key: string, success: boolean) {
  await db.insert(schema.loginAttempts).values({ key, success });
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = configuredHash();
  if (!adminEmail || !hash || !process.env.ADMIN_SESSION_SECRET) {
    return { ok: false, error: "Admin sign-in is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET." };
  }
  const ip = await clientIp();
  const key = `admin:${ip}`;
  if (await isRateLimited(key)) {
    return { ok: false, error: `Too many attempts. Try again in ${WINDOW_MINUTES} minutes.` };
  }
  const emailOk = email.trim().toLowerCase() === adminEmail;
  // Always run bcrypt to keep timing similar whether or not the email matched.
  const passOk = await bcrypt.compare(password, hash);
  if (!emailOk || !passOk) {
    await recordAttempt(key, false);
    return { ok: false, error: "Email or password is incorrect." };
  }
  await recordAttempt(key, true);
  const token = await signSession(adminEmail);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
