import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getGuestSession } from "@/features/guests/session";
import { imageProcessor } from "@/lib/image/processor";
import { storageProvider, validateProductionStorageConfig } from "@/lib/storage/storage";
import type { FilmPresetConfig } from "@/features/presets/preset-config";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxUploadBytes = 10 * 1024 * 1024;

export type UploadPhotoResult =
  | {
      ok: true;
      photo: {
        id: string;
        processedUrl: string;
        thumbnailUrl: string | null;
        shotsRemaining: number;
      };
    }
  | { ok: false; status: number; code: string; message: string };

export async function uploadGuestPhoto(slug: string, formData: FormData): Promise<UploadPhotoResult> {
  const event = await prisma.event.findFirst({
    where: { slug, deletedAt: null },
    include: { preset: true, setting: true }
  });

  if (!event || event.disabledAt || event.status === "DISABLED") {
    return { ok: false, status: 404, code: "EVENT_NOT_FOUND", message: "Event not found." };
  }

  const session = await getGuestSession(event.id);
  if (!session) {
    return { ok: false, status: 401, code: "GUEST_SESSION_REQUIRED", message: "Please join the album before taking photos." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { ok: false, status: 422, code: "PHOTO_REQUIRED", message: "Please select or capture a photo." };
  }

  if (!allowedTypes.has(file.type)) {
    return { ok: false, status: 415, code: "UNSUPPORTED_IMAGE", message: "Only JPEG, PNG, or WebP images are supported." };
  }

  if (file.size > maxUploadBytes) {
    return { ok: false, status: 413, code: "IMAGE_TOO_LARGE", message: "Image must be 10 MB or smaller." };
  }

  const storageConfig = validateProductionStorageConfig();
  if (!storageConfig.ok) {
    return { ok: false, status: 500, code: "STORAGE_NOT_CONFIGURED", message: storageConfig.message };
  }

  const photoId = `photo_${randomBytes(12).toString("hex")}`;
  const processedObjectKey = `events/${event.id}/photos/${photoId}.jpg`;
  const thumbnailObjectKey = `events/${event.id}/thumbnails/${photoId}.jpg`;
  const capturedAtValue = formData.get("capturedAt");
  const capturedAt = typeof capturedAtValue === "string" ? new Date(capturedAtValue) : new Date();
  const storage = storageProvider();

  const created = await prisma.$transaction(
    async (tx) => {
      const guest = await tx.guest.findUnique({
        where: { id: session.guestId },
        select: { id: true, photoCount: true }
      });

      if (!guest) throw new PhotoUploadError("Guest session is no longer valid.", 401, "GUEST_SESSION_REQUIRED");
      if (guest.photoCount >= event.photoLimit) {
        throw new PhotoUploadError("Photo limit reached.", 409, "PHOTO_LIMIT_REACHED");
      }

      const photo = await tx.photo.create({
        data: {
          id: photoId,
          eventId: event.id,
          guestId: guest.id,
          originalObjectKey: null,
          processedObjectKey,
          thumbnailObjectKey,
          presetId: event.presetId,
          mimeType: "image/jpeg",
          capturedAt
        }
      });

      const updatedGuest = await tx.guest.update({
        where: { id: guest.id },
        data: { photoCount: { increment: 1 }, lastActiveAt: new Date() },
        select: { photoCount: true }
      });

      await tx.guestSession.update({
        where: { id: session.id },
        data: { photoCount: { increment: 1 }, lastActiveAt: new Date() }
      });

      return { photo, photoCount: updatedGuest.photoCount };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).catch((error) => {
    if (error instanceof PhotoUploadError) return error;
    throw error;
  });

  if (created instanceof PhotoUploadError) {
    return { ok: false, status: created.status, code: created.code, message: created.message };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const preset = event.preset?.config as FilmPresetConfig | undefined;
    const processed = await imageProcessor.process({
      buffer,
      preset,
      maxWidth: event.setting?.maxImageWidth ?? 2400,
      quality: event.setting?.jpegQuality ?? 84
    });

    await storage.put({ key: processedObjectKey, body: processed.image, contentType: "image/jpeg" });
    await storage.put({ key: thumbnailObjectKey, body: processed.thumbnail, contentType: "image/jpeg" });

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        width: processed.width,
        height: processed.height,
        fileSize: processed.fileSize,
        uploadedAt: new Date()
      }
    });

    return {
      ok: true,
      photo: {
        id: photoId,
        processedUrl: storage.getPublicUrl(processedObjectKey),
        thumbnailUrl: storage.getPublicUrl(thumbnailObjectKey),
        shotsRemaining: Math.max(event.photoLimit - created.photoCount, 0)
      }
    };
  } catch (error) {
    await Promise.all([processedObjectKey, thumbnailObjectKey].map((key) => storage.delete(key).catch(() => undefined)));
    await prisma.$transaction([
      prisma.photo.update({ where: { id: photoId }, data: { status: "DELETED", deletedAt: new Date() } }),
      prisma.guest.update({ where: { id: session.guestId }, data: { photoCount: { decrement: 1 } } }),
      prisma.guestSession.update({ where: { id: session.id }, data: { photoCount: { decrement: 1 } } })
    ]);
    throw error;
  }
}

class PhotoUploadError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}
