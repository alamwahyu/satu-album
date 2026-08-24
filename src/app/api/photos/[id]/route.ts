import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/auth/session";
import { findAuthorizedPhoto } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError } from "@/lib/http/api";
import { storageProvider } from "@/lib/storage/storage";

const updatePhotoSchema = z.object({
  status: z.enum(["ACTIVE", "HIDDEN", "DELETED"]).optional(),
  isFavorite: z.boolean().optional()
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const photo = await findAuthorizedPhoto(id, user);
    if (!photo) return jsonError("Photo not found.", 404, "PHOTO_NOT_FOUND");

    const input = updatePhotoSchema.parse(await request.json());
    if (photo.purgedAt && input.status && input.status !== "DELETED") {
      return jsonError("Deleted photos cannot be restored because their files were permanently removed.", 409, "PHOTO_PERMANENTLY_DELETED");
    }

    const updated = await prisma.photo.update({
      where: { id },
      data: {
        status: input.status,
        isFavorite: input.isFavorite,
        deletedAt: input.status === "DELETED" ? new Date() : input.status === "ACTIVE" || input.status === "HIDDEN" ? null : undefined
      },
      include: { guest: { select: { id: true, name: true } }, preset: { select: { name: true } } }
    });

    return NextResponse.json({ photo: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const photo = await findAuthorizedPhoto(id, user);
    if (!photo) return jsonError("Photo not found.", 404, "PHOTO_NOT_FOUND");

    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "true";

    if (permanent && !photo.purgedAt) {
      await deletePhotoObjects(photo);
    }

    await prisma.photo.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: photo.deletedAt ?? new Date(),
        purgedAt: permanent ? new Date() : undefined
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

async function deletePhotoObjects(photo: {
  originalObjectKey: string | null;
  processedObjectKey: string;
  thumbnailObjectKey: string | null;
}) {
  const storage = storageProvider();
  const keys = [photo.originalObjectKey, photo.processedObjectKey, photo.thumbnailObjectKey].filter(Boolean) as string[];
  await Promise.all(keys.map((key) => storage.delete(key)));
}
