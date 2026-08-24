import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireHost } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";
import { createEventSchema } from "@/lib/validation/event";
import { createEventSlug, createGuestToken } from "@/features/events/slug";
import { computeEventStatus } from "@/features/events/status";

function combineDateTime(date: string, time?: string) {
  if (!time) return null;
  return new Date(`${date}T${time}:00.000Z`);
}

export async function GET() {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");

    const events = await prisma.event.findMany({
      where: user.role === "ADMIN" ? { deletedAt: null } : { ownerId: user.id, deletedAt: null },
      include: {
        _count: { select: { guests: true, photos: true } },
        preset: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const normalized = events.map((event) => ({
      ...event,
      computedStatus: computeEventStatus(event),
      guestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/e/${event.slug}`
    }));

    return NextResponse.json({ events: normalized });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");

    const input = createEventSchema.parse(await request.json());
    const defaultPlanCode = process.env.DEFAULT_PLAN_CODE ?? "FREE";
    const plan = await prisma.plan.findFirst({ where: { code: defaultPlanCode, isActive: true } });

    if (plan?.guestLimit && input.guestLimit && input.guestLimit > plan.guestLimit) {
      return jsonError(`Guest limit exceeds the ${plan.name} plan maximum of ${plan.guestLimit}.`, 403, "PLAN_GUEST_LIMIT_EXCEEDED");
    }

    if (plan?.photoLimitPerGuest && input.photoLimit > plan.photoLimitPerGuest) {
      return jsonError(`Photo limit exceeds the ${plan.name} plan maximum of ${plan.photoLimitPerGuest}.`, 403, "PLAN_PHOTO_LIMIT_EXCEEDED");
    }

    const slug = await createEventSlug(input.name);
    const startAt = combineDateTime(input.eventDate, input.startTime);
    const endAt = combineDateTime(input.eventDate, input.endTime);

    const event = await prisma.event.create({
      data: {
        ownerId: user.id,
        planId: plan?.id,
        presetId: input.presetId || undefined,
        name: input.name,
        slug,
        guestToken: createGuestToken(),
        type: input.type,
        eventDate: new Date(`${input.eventDate}T00:00:00.000Z`),
        startAt,
        endAt,
        timezone: input.timezone,
        venueName: input.venueName,
        coverObjectKey: input.coverObjectKey,
        description: input.description,
        guestLimit: input.guestLimit,
        photoLimit: input.photoLimit,
        revealMode: input.revealMode,
        revealAt: input.revealAt ? new Date(input.revealAt) : null,
        privacy: input.privacy,
        passwordHash: input.eventPassword ? await bcrypt.hash(input.eventPassword, 12) : null,
        allowGuestDownload: input.allowGuestDownload,
        allowGuestGallery: input.allowGuestGallery,
        requireGuestName: input.requireGuestName,
        qrTemplate: input.qrTemplate,
        status: startAt && startAt > new Date() ? "UPCOMING" : "DRAFT",
        setting: { create: {} }
      },
      include: { _count: { select: { guests: true, photos: true } } }
    });

    return NextResponse.json({ event, guestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/e/${event.slug}` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
