import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/session";
import { findAuthorizedEvent } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError } from "@/lib/http/api";
import { storageProvider } from "@/lib/storage/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const event = await findAuthorizedEvent(id, user);
    if (!event) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const guestId = url.searchParams.get("guestId");
    const favorite = url.searchParams.get("favorite");
    const storage = storageProvider();

    const photos = await prisma.photo.findMany({
      where: {
        eventId: id,
        ...(status && status !== "ALL" ? { status: status as "ACTIVE" | "HIDDEN" | "DELETED" } : {}),
        ...(guestId ? { guestId } : {}),
        ...(favorite === "true" ? { isFavorite: true } : {})
      },
      include: { guest: { select: { id: true, name: true } }, preset: { select: { name: true } } },
      orderBy: { capturedAt: "desc" },
      take: 200
    });

    return NextResponse.json({
      photos: photos.map((photo) => ({
        ...photo,
        thumbnailUrl: photo.thumbnailObjectKey ? storage.getPublicUrl(photo.thumbnailObjectKey) : storage.getPublicUrl(photo.processedObjectKey),
        processedUrl: storage.getPublicUrl(photo.processedObjectKey)
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
