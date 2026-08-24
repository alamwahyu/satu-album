import { NextResponse } from "next/server";
import { joinEventSchema } from "@/lib/validation/guest";
import { joinEvent } from "@/features/guests/join-event";
import { handleApiError, jsonError } from "@/lib/http/api";
import { rateLimit } from "@/lib/rate-limit/memory";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`join:${slug}:${ip}`, 20, 60_000);
    if (!limited.allowed) return jsonError("Too many join attempts. Please try again shortly.", 429, "RATE_LIMITED");

    const input = joinEventSchema.parse(await request.json());
    const result = await joinEvent(slug, input, request);

    if (!result.ok) return jsonError(result.message, result.status, result.code);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
