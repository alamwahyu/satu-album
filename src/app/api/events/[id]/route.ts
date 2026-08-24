import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { requireHost } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";
import { createEventSchema } from "@/lib/validation/event";
import { computeEventStatus } from "@/features/events/status";

type Params = { params: Promise<{ id: string }> };

function combineDateTime(date: string, time?: string) {
  if (!time) return null;
  return new Date(`${date}T${time}:00.000Z`);
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
      include: { _count: { select: { guests: true, photos: true } }, preset: true, setting: true }
    });
    if (!event) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    return NextResponse.json({ event: { ...event, computedStatus: computeEventStatus(event) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const rawInput = await request.json();
    const input = createEventSchema.partial().parse(rawInput);
    const has = (key: string) => Object.prototype.hasOwnProperty.call(rawInput, key);

    const existing = await prisma.event.findFirst({
      where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }
    });
    if (!existing) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    const event = await prisma.event.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        eventDate: has("eventDate") && input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : undefined,
        startAt: has("eventDate") && input.eventDate ? combineDateTime(input.eventDate, input.startTime) : undefined,
        endAt: has("eventDate") && input.eventDate ? combineDateTime(input.eventDate, input.endTime) : undefined,
        timezone: has("timezone") ? input.timezone : undefined,
        venueName: input.venueName,
        description: input.description,
        guestLimit: input.guestLimit,
        photoLimit: has("photoLimit") ? input.photoLimit : undefined,
        presetId: has("presetId") ? input.presetId || null : undefined,
        revealMode: has("revealMode") ? input.revealMode : undefined,
        revealAt: has("revealAt") ? (input.revealAt ? new Date(input.revealAt) : null) : undefined,
        allowGuestDownload: has("allowGuestDownload") ? input.allowGuestDownload : undefined,
        allowGuestGallery: has("allowGuestGallery") ? input.allowGuestGallery : undefined,
        requireGuestName: has("requireGuestName") ? input.requireGuestName : undefined,
        privacy: has("privacy") ? input.privacy : undefined,
        qrTemplate: has("qrTemplate") ? input.qrTemplate : undefined,
        passwordHash: input.eventPassword ? await bcrypt.hash(input.eventPassword, 12) : undefined
      }
    });

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;

    const existing = await prisma.event.findFirst({
      where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }
    });
    if (!existing) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");

    await prisma.event.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
