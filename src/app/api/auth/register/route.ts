import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createSession } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) return jsonError("Email is already registered.", 409, "EMAIL_EXISTS");

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: "HOST"
      },
      select: { id: true, email: true, name: true, role: true }
    });

    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
