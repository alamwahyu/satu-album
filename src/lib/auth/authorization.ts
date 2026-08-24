import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";

export async function findAuthorizedEvent(eventId: string, user: SessionUser) {
  return prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      ...(user.role === "ADMIN" ? {} : { ownerId: user.id })
    }
  });
}

export async function findAuthorizedPhoto(photoId: string, user: SessionUser) {
  return prisma.photo.findFirst({
    where: {
      id: photoId,
      event: {
        deletedAt: null,
        ...(user.role === "ADMIN" ? {} : { ownerId: user.id })
      }
    },
    include: { event: true, guest: true, preset: true }
  });
}
