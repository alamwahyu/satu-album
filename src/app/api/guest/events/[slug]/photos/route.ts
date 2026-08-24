import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { uploadGuestPhoto } from "@/features/photos/photo-upload";
import { handleApiError, jsonError } from "@/lib/http/api";
import { rateLimit } from "@/lib/rate-limit/memory";
import { isAlbumRevealed } from "@/features/events/status";
import { storageProvider } from "@/lib/storage/storage";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`gallery:${slug}:${ip}`, 120, 60_000);
    if (!limited.allowed) return jsonError("Too many gallery requests. Please try again shortly.", 429, "RATE_LIMITED");

    const event = await prisma.event.findFirst({
      where: { slug, deletedAt: null },
      include: {
        photos: {
          where: { status: "ACTIVE" },
          include: { guest: { select: { name: true } }, preset: { select: { name: true } } },
          orderBy: { capturedAt: "desc" },
          take: 100
        }
      }
    });

    if (!event || event.disabledAt || event.status === "DISABLED") {
      return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");
    }

    if (!event.allowGuestGallery) {
      return jsonError("Guest gallery is not available for this event.", 403, "GALLERY_DISABLED");
    }

    if (!isAlbumRevealed(event)) {
      return jsonError("Album is not revealed yet.", 403, "ALBUM_NOT_REVEALED");
    }

    const storage = storageProvider();
    return NextResponse.json({
      photos: event.photos.map((photo) => ({
        id: photo.id,
        thumbnailUrl: photo.thumbnailObjectKey ? storage.getPublicUrl(photo.thumbnailObjectKey) : storage.getPublicUrl(photo.processedObjectKey),
        processedUrl: storage.getPublicUrl(photo.processedObjectKey),
        capturedBy: photo.guest.name,
        capturedAt: photo.capturedAt,
        presetName: photo.preset?.name ?? null,
        width: photo.width,
        height: photo.height,
        allowDownload: event.allowGuestDownload
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`photo-upload:${slug}:${ip}`, 30, 60_000);
    if (!limited.allowed) return jsonError("Too many uploads. Please try again shortly.", 429, "RATE_LIMITED");

    const result = await uploadGuestPhoto(slug, await request.formData());
    if (!result.ok) return jsonError(result.message, result.status, result.code);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
