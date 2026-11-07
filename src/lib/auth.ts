import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";

// Deliberately specific: a generic cookie name collides with sibling apps on the same host.
export const SESSION_COOKIE = "auditix_web_session";
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) must be set in production.");
    return new TextEncoder().encode("auditix-development-secret-change-me");
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Only an invalid token means "signed out". A database failure must surface as
  // an error, not as a redirect to sign-in: bouncing the user to the login page
  // during a database outage looked like the session had expired.
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
