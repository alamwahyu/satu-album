import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/http/api";

export async function GET() {
  try {
    const presets = await prisma.filmPreset.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ presets });
  } catch (error) {
    return handleApiError(error);
  }
}
