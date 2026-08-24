import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { computeEventStatus, isAlbumRevealed } from "@/features/events/status";
import { handleApiError, jsonError } from "@/lib/http/api";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const event = await prisma.event.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        eventDate: true,
        startAt: true,
        endAt: true,
        timezone: true,
        venueName: true,
        description: true,
        coverObjectKey: true,
        guestLimit: true,
        photoLimit: true,
        revealMode: true,
        revealAt: true,
        status: true,
        privacy: true,
        passwordHash: true,
        allowGuestDownload: true,
        allowGuestGallery: true,
        requireGuestName: true,
        disabledAt: true,
        deletedAt: true,
        _count: { select: { guests: true, photos: true } }
      }
    });

    if (!event || event.disabledAt || event.status === "DISABLED") {
      return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");
    }

    return NextResponse.json({
      event: {
        ...event,
        passwordHash: undefined,
        hasPassword: Boolean(event.passwordHash),
        computedStatus: computeEventStatus(event),
        isRevealed: isAlbumRevealed(event)
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
