import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

export function createGuestDeviceToken() {
  return randomBytes(24).toString("base64url");
}

export function guestCookieName(eventId: string) {
  return `luma_guest_${eventId.slice(0, 12)}`;
}

export function hashIp(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function setGuestSessionCookie(eventId: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(guestCookieName(eventId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90
  });
}

export async function getGuestSession(eventId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(guestCookieName(eventId))?.value;
  if (!token) return null;

  return prisma.guestSession.findFirst({
    where: { eventId, token },
    include: { guest: true, event: true }
  });
}
