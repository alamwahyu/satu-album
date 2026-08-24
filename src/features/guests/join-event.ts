import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createGuestDeviceToken, hashIp, setGuestSessionCookie } from "@/features/guests/session";
import type { JoinEventInput } from "@/lib/validation/guest";

export type JoinEventResult =
  | { ok: true; guestId: string; sessionId: string; photoCount: number; shotsRemaining: number }
  | { ok: false; status: number; code: string; message: string };

export async function joinEvent(slug: string, input: JoinEventInput, request: Request): Promise<JoinEventResult> {
  const event = await prisma.event.findFirst({
    where: { slug, deletedAt: null },
    include: { _count: { select: { guests: true } } }
  });

  if (!event || event.disabledAt || event.status === "DISABLED") {
    return { ok: false, status: 404, code: "EVENT_NOT_FOUND", message: "Event not found." };
  }

  if (event.passwordHash) {
    const valid = input.password ? await bcrypt.compare(input.password, event.passwordHash) : false;
    if (!valid) return { ok: false, status: 401, code: "INVALID_EVENT_PASSWORD", message: "Event password is incorrect." };
  }

  const guestName = event.requireGuestName ? input.name : input.name || "Guest";
  if (!guestName) {
    return { ok: false, status: 422, code: "GUEST_NAME_REQUIRED", message: "Please enter your name to join this album." };
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.guest.findUnique({
          where: { eventId_deviceId: { eventId: event.id, deviceId: input.deviceId } },
          include: { sessions: { orderBy: { joinedAt: "desc" }, take: 1 } }
        });

        if (existing) {
          const session =
            existing.sessions[0] ??
            (await tx.guestSession.create({
              data: {
                eventId: event.id,
                guestId: existing.id,
                token: createGuestDeviceToken(),
                deviceId: input.deviceId,
                userAgent,
                ipHash: hashIp(forwardedFor),
                photoCount: existing.photoCount
              }
            }));

          await tx.guest.update({
            where: { id: existing.id },
            data: { name: guestName, lastActiveAt: new Date() }
          });
          await tx.guestSession.update({
            where: { id: session.id },
            data: { lastActiveAt: new Date(), userAgent, ipHash: hashIp(forwardedFor) }
          });

          return { guest: existing, session };
        }

        const count = await tx.guest.count({ where: { eventId: event.id } });
        if (event.guestLimit !== null && count >= event.guestLimit) {
          throw new GuestLimitReachedError();
        }

        const guest = await tx.guest.create({
          data: {
            eventId: event.id,
            name: guestName,
            token: createGuestDeviceToken(),
            deviceId: input.deviceId
          }
        });

        const session = await tx.guestSession.create({
          data: {
            eventId: event.id,
            guestId: guest.id,
            token: createGuestDeviceToken(),
            deviceId: input.deviceId,
            userAgent,
            ipHash: hashIp(forwardedFor)
          }
        });

        return { guest, session };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await setGuestSessionCookie(event.id, result.session.token);

    return {
      ok: true,
      guestId: result.guest.id,
      sessionId: result.session.id,
      photoCount: result.guest.photoCount,
      shotsRemaining: Math.max(event.photoLimit - result.guest.photoCount, 0)
    };
  } catch (error) {
    if (error instanceof GuestLimitReachedError) {
      return { ok: false, status: 409, code: "GUEST_LIMIT_REACHED", message: "This event has reached its guest limit." };
    }
    throw error;
  }
}

class GuestLimitReachedError extends Error {}
