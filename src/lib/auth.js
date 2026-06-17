import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "naija_token";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  return secret;
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: SEVEN_DAYS });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

// Set the auth cookie (http-only) for the given user id.
export function setAuthCookie(userId) {
  const token = signToken({ uid: userId });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Returns the current logged-in user (without password) or null.
// Works in both server components and route handlers.
export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.uid },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      city: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      featuredUntil: true,
      proUntil: true,
      _count: { select: { referrals: true } },
    },
  });
  return user;
}
