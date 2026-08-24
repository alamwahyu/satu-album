import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/session";
import { findAuthorizedEvent } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError } from "@/lib/http/api";
import { createEventZip } from "@/features/downloads/event-zip";
import { rateLimit } from "@/lib/rate-limit/memory";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? user.id;
    const limited = rateLimit(`download:${user.id}:${ip}`, 10, 60_000);
    if (!limited.allowed) return jsonError("Too many download requests. Please try again shortly.", 429, "RATE_LIMITED");

    const { id } = await params;
    const event = await findAuthorizedEvent(id, user);
    if (!event) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    const url = new URL(request.url);
    const byGuest = url.searchParams.get("byGuest") === "true";
    const favoriteOnly = url.searchParams.get("favorite") === "true";

    const photos = await prisma.photo.findMany({
      where: {
        eventId: id,
        status: { not: "DELETED" },
        ...(favoriteOnly ? { isFavorite: true } : {})
      },
      include: { guest: { select: { name: true } } },
      orderBy: { capturedAt: "asc" },
      take: 500
    });

    if (photos.length === 0) return jsonError("No photos are available to download.", 404, "NO_PHOTOS");

    const archive = await createEventZip(event.name, photos, { byGuest });

    return new NextResponse(new Uint8Array(archive.buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
