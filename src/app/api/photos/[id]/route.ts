import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/auth/session";
import { findAuthorizedPhoto } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError } from "@/lib/http/api";

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

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const photo = await findAuthorizedPhoto(id, user);
    if (!photo) return jsonError("Photo not found.", 404, "PHOTO_NOT_FOUND");

    await prisma.photo.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
