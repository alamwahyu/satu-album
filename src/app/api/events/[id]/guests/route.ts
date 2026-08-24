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

    const guests = await prisma.guest.findMany({
      where: { eventId: id },
      orderBy: { joinedAt: "desc" },
      include: { _count: { select: { photos: true } } }
    });

    return NextResponse.json({ guests });
  } catch (error) {
    return handleApiError(error);
  }
}
