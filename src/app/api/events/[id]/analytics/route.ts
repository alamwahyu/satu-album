import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/session";
import { findAuthorizedEvent } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError } from "@/lib/http/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const event = await findAuthorizedEvent(id, user);
    if (!event) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    const [guests, photos] = await Promise.all([
      prisma.guest.findMany({ where: { eventId: id }, orderBy: { photoCount: "desc" } }),
      prisma.photo.findMany({ where: { eventId: id, status: { not: "DELETED" } }, include: { guest: true } })
    ]);

    const photosByHour = new Map<string, number>();
    for (const photo of photos) {
      const hour = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(photo.capturedAt).replace(/:\d\d$/, ":00");
      photosByHour.set(hour, (photosByHour.get(hour) ?? 0) + 1);
    }

    const peak = [...photosByHour.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const storageUsed = photos.reduce((sum, photo) => sum + (photo.fileSize ?? 0), 0);

    return NextResponse.json({
      analytics: {
        guestsJoined: guests.length,
        photosCaptured: photos.length,
        averagePhotosPerGuest: guests.length ? photos.length / guests.length : 0,
        mostActiveGuest: guests[0] ? { id: guests[0].id, name: guests[0].name, photos: guests[0].photoCount } : null,
        peakCaptureTime: peak ? { hour: peak[0], photos: peak[1] } : null,
        storageUsed,
        photosByHour: [...photosByHour.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count }))
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
