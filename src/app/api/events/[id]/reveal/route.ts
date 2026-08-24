import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireHost } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }
    });

    if (!event) return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");
    if (event.disabledAt || event.status === "DISABLED") return jsonError("Event is disabled.", 409, "EVENT_DISABLED");

    const revealed = await prisma.event.update({
      where: { id },
      data: {
        status: "REVEALED",
        revealAt: event.revealAt ?? new Date()
      }
    });

    return NextResponse.json({ event: revealed });
  } catch (error) {
    return handleApiError(error);
  }
}
